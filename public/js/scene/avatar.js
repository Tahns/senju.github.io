/*
 * Hoko adulte : un vrai modèle anime (VRoid « HairSample_Male », CC0, allégé
 * et recoloré : yeux et cheveux bruns, gilet de jōnin peint sur le haut),
 * équipé par ninja.js (bandeau, sabre, bourse, étui, bandes, sandales). Son squelette recopie à chaque image les rotations du squelette
 * d'animation de ninja.js (reciblage), donc toutes les poses du rêve marchent.
 */
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../vendor/utils/BufferGeometryUtils.js';

const MODEL = new URL('../../models/hoko.vrm', import.meta.url).href;

let pending = null;
// Chargé en arrière-plan dès le début de la scène ; null si indisponible.
// Repli : certains hébergeurs (aperçus) ne servent pas les .vrm ; on essaie
// alors une copie en base64 (hoko.vrm.txt) si elle existe.
export function loadAvatar() {
    if (!pending) {
        const loader = new GLTFLoader();
        const base = MODEL.slice(0, MODEL.lastIndexOf('/') + 1);
        const fromText = () => fetch(MODEL + '.txt')
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
            .then((text) => {
                const bin = atob(text.trim());
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                return new Promise((resolve, reject) => loader.parse(bytes.buffer, base, resolve, reject));
            });
        pending = new Promise((resolve) => {
            loader.load(MODEL, resolve, undefined, () => {
                fromText().then(resolve).catch((error) => {
                    console.warn('Modèle de Hoko indisponible, repli sur la tête sculptée.', error);
                    resolve(null);
                });
            });
        });
    }
    return pending;
}

// Matériaux « unlit » de VRoid → matériaux éclairés, avec une lueur propre
// (rendu anime lisse) ; vêtements recolorés en tenue de ninja.
// La chevelure VRoid arrive découpée en une centaine de maillages (une mèche
// chacun), soit autant d'appels de dessin, doublés par les ombres. Les mèches qui
// partagent squelette, matériau et parent sont fusionnées en un seul maillage.
function mergeHair(model) {
    const groups = new Map();
    model.traverse((o) => {
        if (!o.isSkinnedMesh || Array.isArray(o.material) || !/HAIR/.test(o.material.name || '')) return;
        const key = [o.parent.uuid, o.material.uuid, o.skeleton.bones.map((b) => b.uuid).join(','), o.bindMatrix.elements.join(',')].join('|');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(o);
    });
    groups.forEach((meshes) => {
        if (meshes.length < 2) return;
        const merged = mergeGeometries(meshes.map((m) => m.geometry), false);
        if (!merged) return; // attributs différents : on garde les mèches séparées
        const first = meshes[0];
        const hair = new THREE.SkinnedMesh(merged, first.material);
        hair.name = 'HairMerged';
        hair.position.copy(first.position);
        hair.quaternion.copy(first.quaternion);
        hair.scale.copy(first.scale);
        first.parent.add(hair);
        hair.bind(first.skeleton, first.bindMatrix);
        meshes.forEach((m) => { m.parent.remove(m); m.geometry.dispose(); });
    });
}

function restyle(model) {
    mergeHair(model);
    // Le haut porte déjà le gilet de jōnin peint dans sa texture ; le bas passe au bleu nuit.
    const tints = { Bottoms: '#8f9ad8' };
    model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const convert = (m) => {
            const name = m.name || '';
            const std = new THREE.MeshStandardMaterial({
                name,
                map: m.map,
                color: m.color.clone(),
                transparent: m.transparent,
                alphaTest: m.alphaTest,
                side: m.side,
                depthWrite: m.depthWrite,
                roughness: 0.78,
                metalness: 0,
                emissive: new THREE.Color('#ffffff'),
                emissiveMap: m.map,
                emissiveIntensity: /SKIN|FACE|EYE/.test(name) ? 0.12 : 0.14
            });
            Object.entries(tints).forEach(([k, c]) => {
                if (!name.includes(k)) return;
                std.color.set(c);
                std.emissive.set(c);
            });
            if (name.includes('Shoes')) std.visible = false;
            return std;
        };
        o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
    });
}

// Positions des os au repos (modèle tourné face à +Z), pour caler le squelette
// d'animation sur les proportions du modèle.
export function measureAvatar(gltf) {
    const model = gltf.scene;
    model.rotation.y = Math.PI;
    model.updateMatrixWorld(true);
    const at = (name) => {
        const b = model.getObjectByName(name);
        return b ? b.getWorldPosition(new THREE.Vector3()) : null;
    };
    return {
        hips: at('J_Bip_C_Hips'), spine: at('J_Bip_C_Spine'), neck: at('J_Bip_C_Neck'), head: at('J_Bip_C_Head'),
        arm: at('J_Bip_L_UpperArm'), elbow: at('J_Bip_L_LowerArm'), hand: at('J_Bip_L_Hand'),
        leg: at('J_Bip_L_UpperLeg'), knee: at('J_Bip_L_LowerLeg'), foot: at('J_Bip_L_Foot')
    };
}

/*
 * Reciblage : chaque os du modèle suit l'orientation (monde) d'une articulation
 * de ninja.js, à un décalage près calculé une fois, les deux squelettes au repos.
 * Le côté gauche de ninja.js est en x < 0 : c'est le côté droit du personnage.
 */
export function bindAvatar(gltf, J, parent) {
    const model = gltf.scene;
    restyle(model);
    // Pas de capuche sous le gilet de jōnin : on replie ses os.
    ['J_Sec_C_Hood', 'J_Sec_L_HoodString1', 'J_Sec_R_HoodString1'].forEach((n) => {
        const b = model.getObjectByName(n);
        if (b) b.scale.setScalar(0.02);
    });
    model.rotation.y = Math.PI; // VRM 0.x regarde vers -Z
    parent.add(model);
    const bone = (name) => model.getObjectByName(name);
    const pairs = [
        [J.hips, 'J_Bip_C_Hips'],
        [J.spine, 'J_Bip_C_Spine'],
        [J.neck, 'J_Bip_C_Neck'],
        [J.head, 'J_Bip_C_Head'],
        [J.shoulderL, 'J_Bip_R_UpperArm', J.elbowL, 'J_Bip_R_LowerArm'],
        [J.elbowL, 'J_Bip_R_LowerArm', J.handL, 'J_Bip_R_Hand'],
        [J.handL, 'J_Bip_R_Hand'],
        [J.shoulderR, 'J_Bip_L_UpperArm', J.elbowR, 'J_Bip_L_LowerArm'],
        [J.elbowR, 'J_Bip_L_LowerArm', J.handR, 'J_Bip_L_Hand'],
        [J.handR, 'J_Bip_L_Hand'],
        [J.hipL, 'J_Bip_R_UpperLeg', J.kneeL, 'J_Bip_R_LowerLeg'],
        [J.kneeL, 'J_Bip_R_LowerLeg', J.footL, 'J_Bip_R_Foot'],
        [J.footL, 'J_Bip_R_Foot'],
        [J.hipR, 'J_Bip_L_UpperLeg', J.kneeR, 'J_Bip_L_LowerLeg'],
        [J.kneeR, 'J_Bip_L_LowerLeg', J.footR, 'J_Bip_L_Foot'],
        [J.footR, 'J_Bip_L_Foot']
    ].map(([joint, name, childJoint, childName]) => ({ joint, bone: bone(name), childJoint, childBone: childName && bone(childName) }))
        .filter((p) => p.bone);

    // 1. Squelette d'animation au repos (bras le long du corps).
    const saved = new Map();
    parent.traverse((o) => {
        if (o.isGroup && !o.isBone && o !== parent && Object.values(J).includes(o)) {
            saved.set(o, o.quaternion.clone());
            o.quaternion.identity();
        }
    });
    parent.updateMatrixWorld(true);

    // 2. Même taille : hanches à la même hauteur.
    const hips = pairs[0].bone;
    const v = new THREE.Vector3();
    const w = new THREE.Vector3();
    model.updateMatrixWorld(true);
    const scale = J.hips.getWorldPosition(v).y / hips.getWorldPosition(w).y;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);

    // 3. Le modèle (en T) passe dans la pose de repos : membres dans la même direction.
    const q = new THREE.Quaternion();
    const pw = new THREE.Quaternion();
    const bw = new THREE.Quaternion();
    pairs.forEach((p) => {
        if (!p.childBone) return;
        const from = p.childBone.getWorldPosition(new THREE.Vector3()).sub(p.bone.getWorldPosition(v)).normalize();
        const to = p.childJoint.getWorldPosition(new THREE.Vector3()).sub(p.joint.getWorldPosition(w)).normalize();
        q.setFromUnitVectors(from, to);
        p.bone.getWorldQuaternion(bw);
        p.bone.parent.getWorldQuaternion(pw);
        p.bone.quaternion.copy(pw.invert().multiply(q.multiply(bw)));
        model.updateMatrixWorld(true);
    });

    // 4. Décalages d'orientation, et décalage des hanches.
    const jq = new THREE.Quaternion();
    pairs.forEach((p) => {
        p.joint.getWorldQuaternion(jq);
        p.bone.getWorldQuaternion(bw);
        p.offset = jq.clone().invert().multiply(bw);
    });
    // (le parent est encore à l'origine : monde = repère du parent)
    const hipsOffset = hips.getWorldPosition(new THREE.Vector3()).sub(J.hips.getWorldPosition(v));

    // 5. On rend au squelette d'animation sa pose.
    saved.forEach((quat, o) => o.quaternion.copy(quat));
    parent.updateMatrixWorld(true);

    // Expressions : table officielle du modèle (groupes VRM « Blink », « Angry »…),
    // qui dit quelles formes du visage activer et avec quel poids.
    const faces = [];
    model.traverse((o) => { if (o.isMesh && o.morphTargetInfluences) faces.push(o); });
    const groups = ((gltf.parser.json.extensions || {}).VRM || {}).blendShapeMaster?.blendShapeGroups || [];
    const meshIndex = (o) => (gltf.parser.associations.get(o) || {}).meshes;
    const morph = (group) => {
        const g = groups.find((x) => x.name.toLowerCase() === group.toLowerCase());
        if (!g) return () => {};
        const targets = [];
        g.binds.forEach((bind) => faces.forEach((m) => { if (meshIndex(m) === bind.mesh) targets.push([m, bind.index, bind.weight / 100]); }));
        return (value) => targets.forEach(([m, i, w]) => { m.morphTargetInfluences[i] = value * w; });
    };
    const expressions = { blink: morph('Blink'), angry: morph('Angry'), joy: morph('Joy'), fun: morph('Fun') };

    // Doigts : repliés vers la paume (main détendue, ou poing fermé sur la poignée).
    // Côté « L » du modèle = main droite du personnage (x > 0).
    const fingers = { L: [], R: [] };
    ['L', 'R'].forEach((side) => ['Index', 'Middle', 'Ring', 'Little'].forEach((f) => [1, 2, 3].forEach((k) => {
        const b = bone(`J_Bip_${side}_${f}${k}`);
        if (b) fingers[side].push(b);
    })));
    const thumbs = { L: bone('J_Bip_L_Thumb2'), R: bone('J_Bip_R_Thumb2') };
    function curl(side, amount) {
        const s = side === 'L' ? -1 : 1;
        fingers[side].forEach((b) => { b.rotation.z = s * amount; });
        if (thumbs[side]) thumbs[side].rotation.y = -s * amount * 0.5;
    }
    curl('L', 0.35);
    curl('R', 0.35);

    // Mèches (os « HairJoint » de VRoid) : elles ondulent au vent.
    const hairBones = [];
    model.traverse((o) => { if (o.isBone && o.name.startsWith('HairJoint')) hairBones.push({ b: o, q: o.quaternion.clone(), k: hairBones.length }); });
    const sway = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const target = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    return {
        model,
        expressions,
        bone,
        wind(time) {
            hairBones.forEach(({ b, q, k }) => {
                euler.set(Math.sin(time * 2.1 + k * 0.7) * 0.05, 0, Math.sin(time * 1.6 + k * 1.3) * 0.06);
                b.quaternion.copy(q).multiply(sway.setFromEuler(euler));
            });
        },
        // Main droite (sabre) ou gauche : 0 = détendue, 1 = poing fermé.
        // closed : true (poing), false (main détendue) ou un degré de fermeture.
        grip(hand, closed) { curl(hand === 'right' ? 'L' : 'R', closed === true ? 1.25 : closed === false ? 0.35 : closed); },
        head: pairs.find((p) => p.joint === J.head).bone,
        sync() {
            parent.updateMatrixWorld(true);
            pairs.forEach((p) => {
                p.joint.getWorldQuaternion(jq);
                target.copy(jq).multiply(p.offset);
                p.bone.parent.getWorldQuaternion(pw);
                p.bone.quaternion.copy(pw.invert().multiply(target));
                p.bone.updateMatrixWorld(true);
            });
            pos.copy(J.hips.position).add(hipsOffset);
            parent.localToWorld(pos);
            hips.parent.worldToLocal(pos);
            hips.position.copy(pos);
            model.updateMatrixWorld(true);
        }
    };
}
