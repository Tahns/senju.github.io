/*
 * Post-traitement du rêve, façon moteur de jeu : profondeur de champ (le
 * village flou derrière Hoko), halo lumineux doux, étalonnage et vignette.
 * Trois petites passes seulement, pour rester fluide.
 */
import * as THREE from 'three';

const VERTEX = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

function triangle() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    return g;
}

// Disque de points (angle d'or) pour le flou d'arrière-plan.
const TAPS = 24;
const disk = Array.from({ length: TAPS }, (_, i) => {
    const r = Math.sqrt((i + 0.5) / TAPS);
    const a = i * 2.39996;
    return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r);
});

export class Post {
    constructor(renderer) {
        this.renderer = renderer;
        this.size = new THREE.Vector2();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quad = new THREE.Mesh(triangle());
        this.quad.frustumCulled = false;
        const depthTexture = new THREE.DepthTexture(1, 1);
        this.main = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4, depthTexture });
        this.bloomA = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
        this.bloomB = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
        this.focus = 7;

        this.bright = new THREE.ShaderMaterial({
            uniforms: { tColor: { value: null }, texel: { value: new THREE.Vector2() } },
            vertexShader: VERTEX,
            fragmentShader: `uniform sampler2D tColor; uniform vec2 texel; varying vec2 vUv;
                void main(){
                    vec3 c = texture2D(tColor, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tColor, vUv + texel * vec2(1.0, -1.0)).rgb
                           + texture2D(tColor, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tColor, vUv + texel * vec2(1.0, 1.0)).rgb;
                    c *= 0.25;
                    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
                    float k = smoothstep(0.75, 1.6, l);
                    gl_FragColor = vec4(c * k, 1.0);
                }`,
            depthTest: false,
            depthWrite: false,
            toneMapped: false
        });
        this.blur = new THREE.ShaderMaterial({
            uniforms: { tColor: { value: null }, dir: { value: new THREE.Vector2() } },
            vertexShader: VERTEX,
            fragmentShader: `uniform sampler2D tColor; uniform vec2 dir; varying vec2 vUv;
                void main(){
                    vec3 c = texture2D(tColor, vUv).rgb * 0.227;
                    c += (texture2D(tColor, vUv + dir * 1.385).rgb + texture2D(tColor, vUv - dir * 1.385).rgb) * 0.316;
                    c += (texture2D(tColor, vUv + dir * 3.231).rgb + texture2D(tColor, vUv - dir * 3.231).rgb) * 0.07;
                    gl_FragColor = vec4(c, 1.0);
                }`,
            depthTest: false,
            depthWrite: false,
            toneMapped: false
        });
        this.composite = new THREE.ShaderMaterial({
            uniforms: {
                tColor: { value: null },
                tDepth: { value: null },
                tBloom: { value: null },
                texel: { value: new THREE.Vector2() },
                near: { value: 0.1 },
                far: { value: 400 },
                focus: { value: 7 },
                blur: { value: 7 },
                disk: { value: disk }
            },
            vertexShader: VERTEX,
            fragmentShader: `uniform sampler2D tColor; uniform sampler2D tDepth; uniform sampler2D tBloom;
                uniform vec2 texel; uniform float near; uniform float far; uniform float focus; uniform float blur;
                uniform vec2 disk[${TAPS}];
                varying vec2 vUv;
                float viewZ(vec2 uv){ float d = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * near * far / (far + near - d * (far - near)); }
                float coc(float z){ float c = (z - focus) / z; return c > 0.0 ? clamp(c * 1.5, 0.0, 1.0) : clamp(-c * 0.5, 0.0, 1.0); }
                void main(){
                    vec3 col = texture2D(tColor, vUv).rgb;
                    float c = coc(viewZ(vUv));
                    if (c > 0.03) {
                        vec3 sum = col;
                        float wsum = 1.0;
                        for (int i = 0; i < ${TAPS}; i++) {
                            vec2 uv = vUv + disk[i] * texel * blur * c;
                            float cs = coc(viewZ(uv));
                            // Un point net (Hoko) ne bave pas sur le fond flou.
                            float w = smoothstep(0.0, 0.25, cs);
                            sum += texture2D(tColor, uv).rgb * w;
                            wsum += w;
                        }
                        col = sum / wsum;
                    }
                    col += texture2D(tBloom, vUv).rgb * 0.35;
                    // Étalonnage : couleurs un peu plus riches, ombres légèrement bleutées.
                    float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
                    col = mix(vec3(l), col, 1.14);
                    col += vec3(-0.004, 0.0, 0.012) * (1.0 - smoothstep(0.0, 0.4, l));
                    gl_FragColor = vec4(max(col, 0.0), 1.0);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                    vec2 v = vUv - 0.5;
                    gl_FragColor.rgb *= 1.0 - dot(v, v) * 0.55;
                }`,
            depthTest: false,
            depthWrite: false
        });
    }

    setSize(w, h) {
        this.main.setSize(w, h);
        const bw = Math.max(1, Math.round(w / 4));
        const bh = Math.max(1, Math.round(h / 4));
        this.bloomA.setSize(bw, bh);
        this.bloomB.setSize(bw, bh);
        this.bright.uniforms.texel.value.set(1 / w, 1 / h);
        this.composite.uniforms.texel.value.set(1 / w, 1 / h);
        this.bloomTexel = new THREE.Vector2(1 / bw, 1 / bh);
        // Le flou se règle sur la hauteur de l'image.
        this.composite.uniforms.blur.value = h / 110;
    }

    pass(material, target) {
        this.quad.material = material;
        this.renderer.setRenderTarget(target);
        this.renderer.render(this.quad, this.camera);
    }

    render(scene, camera) {
        const r = this.renderer;
        const size = r.getDrawingBufferSize(new THREE.Vector2());
        if (!size.equals(this.size)) {
            this.size.copy(size);
            this.setSize(size.x, size.y);
        }
        r.setRenderTarget(this.main);
        r.render(scene, camera);

        this.bright.uniforms.tColor.value = this.main.texture;
        this.pass(this.bright, this.bloomA);
        for (let i = 0; i < 2; i++) {
            this.blur.uniforms.tColor.value = this.bloomA.texture;
            this.blur.uniforms.dir.value.set(this.bloomTexel.x * (i + 1), 0);
            this.pass(this.blur, this.bloomB);
            this.blur.uniforms.tColor.value = this.bloomB.texture;
            this.blur.uniforms.dir.value.set(0, this.bloomTexel.y * (i + 1));
            this.pass(this.blur, this.bloomA);
        }

        const u = this.composite.uniforms;
        u.tColor.value = this.main.texture;
        u.tDepth.value = this.main.depthTexture;
        u.tBloom.value = this.bloomA.texture;
        u.near.value = camera.near;
        u.far.value = camera.far;
        u.focus.value = this.focus;
        this.pass(this.composite, null);
    }
}
