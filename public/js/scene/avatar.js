/*
 * Akira adulte : modèle 3D généré avec Higgsfield (public/models/akira.glb,
 * déjà vêtu et équipé). En secours : un modèle anime VRoid (« HairSample_Male », CC0, allégé
 * et recoloré : yeux pâles du Byakugan, cheveux bruns, gilet de jōnin peint sur le haut),
 * équipé par ninja.js (bandeau, sabre, bourse, étui, bandes, sandales). Son squelette recopie à chaque image les rotations du squelette
 * d'animation de ninja.js (reciblage), donc toutes les poses du rêve marchent.
 */
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/loaders/GLTFLoader.js';
import { mergeGeometries } from '../../vendor/utils/BufferGeometryUtils.js';

// Modèle d'Akira généré avec Higgsfield (image → 3D riggée, Meshy) ; l'ancien
// modèle VRoid reste en secours si le GLB ne se charge pas.
const MODEL = new URL('../../models/akira.glb', import.meta.url).href;
const FALLBACK = new URL('../../models/hoko.vrm', import.meta.url).href;

// Noms des os selon le modèle. R / L : côté droit / gauche du personnage.
// facing : rotation qui le tourne face à +Z (VRM 0.x regarde vers -Z).
const RIGS = {
    vrm: {
        facing: Math.PI, hips: 'J_Bip_C_Hips', spine: 'J_Bip_C_Spine', neck: 'J_Bip_C_Neck', head: 'J_Bip_C_Head',
        armR: 'J_Bip_R_UpperArm', foreR: 'J_Bip_R_LowerArm', handR: 'J_Bip_R_Hand',
        armL: 'J_Bip_L_UpperArm', foreL: 'J_Bip_L_LowerArm', handL: 'J_Bip_L_Hand',
        legR: 'J_Bip_R_UpperLeg', kneeR: 'J_Bip_R_LowerLeg', footR: 'J_Bip_R_Foot',
        legL: 'J_Bip_L_UpperLeg', kneeL: 'J_Bip_L_LowerLeg', footL: 'J_Bip_L_Foot'
    },
    glb: {
        facing: 0, hips: 'Hips', spine: 'Spine02', neck: 'neck', head: 'Head',
        armR: 'RightArm', foreR: 'RightForeArm', handR: 'RightHand',
        armL: 'LeftArm', foreL: 'LeftForeArm', handL: 'LeftHand',
        legR: 'RightUpLeg', kneeR: 'RightLeg', footR: 'RightFoot',
        legL: 'LeftUpLeg', kneeL: 'LeftLeg', footL: 'LeftFoot'
    }
};
const rigOf = (model) => (model.getObjectByName('J_Bip_C_Hips') ? RIGS.vrm : RIGS.glb);

let pending = null;
// Avancement du téléchargement du modèle (0 → 1), pour l'afficher si on l'attend.
let progress = 0;
export const avatarProgress = () => progress;
// Chargé en arrière-plan dès le début de la scène ; null si indisponible.
// Repli : certains hébergeurs (aperçus) ne servent pas les .vrm ; on essaie
// alors une copie en base64 (hoko.vrm.txt) si elle existe.
// Animations Higgsfield (capture de mouvement Meshy, extraites sans maillage par
// tools : voir JOURNAL) : chaque fichier porte son clip et la pose de repos de son
// squelette (scenes[0].extras.rest), pour recibler sur le modèle du site.
const CLIPS = ['idle', 'kungfu', 'charge', 'cheer', 'victory'];
let clipsPending = null;
export function loadClips() {
    if (!clipsPending) {
        const loader = new GLTFLoader();
        clipsPending = Promise.all(CLIPS.map((name) => new Promise((resolve) => {
            const url = new URL(`../../models/anims/${name}.glb`, import.meta.url).href;
            loader.load(url, (gltf) => resolve([name, gltf]), undefined, () => resolve([name, null]));
        }))).then((list) => Object.fromEntries(list.filter(([, g]) => g)));
    }
    return clipsPending;
}

export function loadAvatar() {
    if (!pending) {
        const loader = new GLTFLoader();
        const base = MODEL.slice(0, MODEL.lastIndexOf('/') + 1);
        const fromText = () => fetch(FALLBACK + '.txt')
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status))))
            .then((text) => {
                const bin = atob(text.trim());
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                return new Promise((resolve, reject) => loader.parse(bytes.buffer, base, resolve, reject));
            });
        pending = new Promise((resolve) => {
            const done = (gltf) => { progress = 1; resolve(gltf); };
            const onProgress = (e) => { if (e.total) progress = e.loaded / e.total; };
            const vrm = () => loader.load(FALLBACK, done, onProgress, () => {
                fromText().then(done).catch((error) => {
                    console.warn("Modèle d'Akira indisponible, repli sur la tête sculptée.", error);
                    resolve(null);
                });
            });
            loader.load(MODEL, done, onProgress, vrm);
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

// Position de repos d'un os dans l'espace de liaison du maillage. Pas
// o.bindMatrixInverse : three.js le recalcule d'après la place actuelle du
// maillage, et le modèle, déjà retourné de 180° (measureAvatar), donnait des os
// en miroir (manches raccourcies de 12 cm, pantalon décalé, dos resserré au
// lieu du ventre).
const restM = new THREE.Matrix4();
const restB = new THREE.Matrix4();
function restBone(o, i, target = new THREE.Vector3()) {
    return target.setFromMatrixPosition(restM.copy(o.bindMatrix).invert().multiply(restB.copy(o.skeleton.boneInverses[i]).invert()));
}
// Les primitives d'un même maillage VRoid partagent leurs sommets : chaque
// déformation ne doit passer qu'une fois sur un tableau de positions (le cou
// était élargi quatre fois sur le corps, deux fois sur le visage).
function firstPass(o, done) {
    const pos = o.geometry.attributes.position;
    if (done.has(pos)) return false;
    done.add(pos);
    return true;
}

// Le cou du modèle VRoid est très fin (style « bishōnen ») : on écarte de
// l'axe du cou les sommets qui suivent son os, en proportion de leur poids,
// pour un cou de ninja adulte. Tête et épaules ne bougent pas.
function thickenNeck(model, factor = 1.3) {
    model.updateMatrixWorld(true);
    const done = new Set();
    const axis = new THREE.Vector3();
    const headAt = new THREE.Vector3();
    const v = new THREE.Vector3();
    model.traverse((o) => {
        // Seulement la peau (le col du haut garde sa forme).
        if (!o.isSkinnedMesh || !/_SKIN/.test(o.material.name || '')) return;
        const bones = o.skeleton.bones;
        const n = bones.findIndex((b) => b.name === 'J_Bip_C_Neck');
        const h = bones.findIndex((b) => b.name === 'J_Bip_C_Head');
        if (n < 0 || h < 0) return;
        // Os du cou et de la tête dans l'espace de liaison du maillage.
        if (!firstPass(o, done)) return;
        restBone(o, n, axis);
        restBone(o, h, headAt);
        const pos = o.geometry.attributes.position;
        let moved = 0;
        for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i);
            // Région du fût du cou, par la position seulement (et non par les
            // poids des os) : le visage et le corps, deux maillages cousus au
            // cou, s'élargissent exactement pareil, sans marche à la couture.
            const r = Math.hypot(v.x - axis.x, v.z - axis.z);
            const near = 1 - THREE.MathUtils.smoothstep(r, 0.05, 0.085);
            const rise = THREE.MathUtils.smoothstep(v.y, axis.y, axis.y + 0.04);
            const fall = 1 - THREE.MathUtils.smoothstep(v.y, headAt.y - 0.03, headAt.y + 0.01);
            const k = near * rise * fall;
            if (k <= 0) continue;
            const s = 1 + (factor - 1) * k;
            pos.setXYZ(i, axis.x + (v.x - axis.x) * s, v.y, axis.z + (v.z - axis.z) * s);
            moved++;
        }
        if (moved) {
            pos.needsUpdate = true;
            o.geometry.computeBoundingSphere();
        }
    });
}

// La peau du torse, cachée sous le haut, le traversait par endroits (taches
// de peau au bord du col). Chaque sommet caché recule de quelques millimètres
// vers son os principal (les normales du modèle ne sont pas toutes fiables),
// seulement sous la base du cou : cou, mains et visage restent intacts.
const COVERED = /^J_Bip_(C_(Spine|Chest|UpperChest)|[LR]_(Shoulder|UpperArm))$/;
function tuckSkin(model, depth = 0.01) {
    model.updateMatrixWorld(true);
    const done = new Set();
    const v = new THREE.Vector3();
    const dir = new THREE.Vector3();
    model.traverse((o) => {
        if (!o.isSkinnedMesh || !/Body_00_SKIN/.test(o.material.name || '')) return;
        const bones = o.skeleton.bones;
        const n = bones.findIndex((b) => b.name === 'J_Bip_C_Neck');
        if (n < 0 || !firstPass(o, done)) return;
        const at = bones.map((b, i) => restBone(o, i));
        const covered = bones.map((b) => COVERED.test(b.name));
        const pos = o.geometry.attributes.position;
        const idx = o.geometry.attributes.skinIndex;
        const wt = o.geometry.attributes.skinWeight;
        for (let i = 0; i < pos.count; i++) {
            let w = 0;
            let best = -1;
            let bestW = 0;
            for (let k = 0; k < 4; k++) {
                const b = idx.getComponent(i, k);
                const bw = wt.getComponent(i, k);
                if (!covered[b]) continue;
                w += bw;
                if (bw > bestW) { bestW = bw; best = b; }
            }
            if (w < 0.2) continue;
            v.fromBufferAttribute(pos, i);
            if (v.y > at[n].y - 0.005) continue;
            // Vers l'os, à l'horizontale pour le tronc (l'os est sur l'axe du corps).
            dir.subVectors(at[best], v);
            if (!/Arm|Shoulder/.test(bones[best].name)) dir.y = 0;
            const len = dir.length();
            if (len < 0.02) continue;
            v.addScaledVector(dir, (depth * Math.min(1, w)) / len);
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        pos.needsUpdate = true;
    });
}

// Malgré tout, dès que les bras se lèvent (paumes, Kaiten), la peau des bras
// et des épaules traversait les manches. Toute la peau couverte par le haut et
// le pantalon est donc retirée du maillage : on ne garde que les triangles qui
// touchent une partie visible (mains, cou, tête, pieds).
const VISIBLE = /Hand|Thumb|Index|Middle|Ring|Little|Neck|Head|Foot|Toe/;
function hideCoveredSkin(model) {
    model.traverse((o) => {
        if (!o.isSkinnedMesh || !/Body_00_SKIN/.test(o.material.name || '') || !o.geometry.index) return;
        const bones = o.skeleton.bones;
        const visible = bones.map((b) => VISIBLE.test(b.name));
        const neck = bones.findIndex((b) => b.name === 'J_Bip_C_Neck');
        const neckAt = neck < 0 ? null : restBone(o, neck);
        const neckY = neckAt ? neckAt.y : -Infinity;
        const idx = o.geometry.attributes.skinIndex;
        const wt = o.geometry.attributes.skinWeight;
        const pos = o.geometry.attributes.position;
        const shown = new Uint8Array(idx.count);
        for (let i = 0; i < idx.count; i++) {
            let w = 0;
            let other = 0;
            for (let k = 0; k < 4; k++) {
                const b = idx.getComponent(i, k);
                if (!visible[b]) continue;
                w += wt.getComponent(i, k);
                if (b !== neck) other += wt.getComponent(i, k);
            }
            // Peau des épaules sous le col (loin de l'axe du cou) : cachée, sinon
            // elle débordait du col comme une plaque. La colonne du cou, elle,
            // descend jusque dans le col (sinon on voyait le col vide).
            const off = neckAt ? Math.hypot(pos.getX(i) - neckAt.x, pos.getZ(i) - neckAt.z) : 1;
            const underCollar = other < 0.3 && pos.getY(i) < neckY + 0.012 && off > 0.08;
            // Bas du cou devant (rattaché au torse) : gardé, sinon le col paraît vide.
            const neckColumn = off < 0.07 && pos.getY(i) > neckY - 0.05;
            shown[i] = (w > 0.3 && !underCollar) || neckColumn ? 1 : 0;
        }
        const src = o.geometry.index.array;
        const keep = [];
        for (let t = 0; t < src.length; t += 3) {
            if (shown[src[t]] || shown[src[t + 1]] || shown[src[t + 2]]) keep.push(src[t], src[t + 1], src[t + 2]);
        }
        o.geometry.setIndex(keep);
    });
}

// Silhouette : le haut du modèle est un sweat ample (poche kangourou, bas
// évasé) qui gonflait le ventre, avec des manches bouffantes, alors que le
// pantalon est très fin (jambes plus fines que les bras). On resserre le
// devant du ventre, on affine un peu les manches et on
// élargit les jambes du pantalon (déformation dans l'espace de liaison).
function reshapeClothes(model) {
    model.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const q = new THREE.Vector3();
    const CHILD = { UpperArm: 'LowerArm', LowerArm: 'Hand', UpperLeg: 'LowerLeg', LowerLeg: 'Foot' };
    model.traverse((o) => {
        if (!o.isSkinnedMesh) return;
        const name = o.material.name || '';
        const top = /Tops/.test(name);
        const bottom = /Bottoms/.test(name);
        if (!top && !bottom) return;
        const bones = o.skeleton.bones;
        const at = bones.map((bn, i) => restBone(o, i));
        const find = (n) => bones.findIndex((bn) => bn.name === n);
        const hips = find('J_Bip_C_Hips');
        const chest = find('J_Bip_C_UpperChest') >= 0 ? find('J_Bip_C_UpperChest') : find('J_Bip_C_Chest');
        const neck = find('J_Bip_C_Neck');
        if (hips < 0 || chest < 0 || neck < 0) return;
        // Devant du ventre : côté -z dans l'espace de liaison (VRM 0.x regarde vers -Z).
        const front = -1;
        const axisZ = at[hips].z;
        const pos = o.geometry.attributes.position;
        const idx = o.geometry.attributes.skinIndex;
        const wt = o.geometry.attributes.skinWeight;
        // Le haut et le pantalon partagent les mêmes sommets (un seul maillage à
        // deux matériaux) : on ne touche qu'aux sommets de ce vêtement.
        const own = new Set(o.geometry.index ? o.geometry.index.array : []);
        for (let i = 0; i < pos.count; i++) {
            if (own.size && !own.has(i)) continue;
            let best = -1;
            let bw = 0;
            for (let k = 0; k < 4; k++) {
                const w = wt.getComponent(i, k);
                if (w > bw) { bw = w; best = idx.getComponent(i, k); }
            }
            if (best < 0) continue;
            const bone = bones[best].name;
            v.fromBufferAttribute(pos, i);
            const limb = /_(UpperArm|LowerArm|UpperLeg|LowerLeg)$/.exec(bone);
            // Bas du haut accroché aux cuisses : traité comme le ventre.
            if (limb && !(top && limb[1].endsWith('Leg'))) {
                const arm = limb[1].endsWith('Arm');
                // Manches à peine affinées (sweat) ; jambes du pantalon élargies.
                const f = top && arm ? 0.97 : bottom && !arm ? 1.2 : 1;
                if (f === 1) continue;
                const child = find(bone.replace(limb[1], CHILD[limb[1]]));
                if (child < 0) continue;
                a.copy(at[best]);
                b.copy(at[child]);
                ab.subVectors(b, a);
                const t = Math.max(0, Math.min(1, q.subVectors(v, a).dot(ab) / ab.lengthSq()));
                q.copy(a).addScaledVector(ab, t);
                // Cuisse : élargie progressivement (rien à l'aine, sinon le
                // pantalon dépasse du bas du haut).
                const g = limb[1] === 'UpperLeg' ? 1 + (f - 1) * THREE.MathUtils.smoothstep(t, 0.08, 0.45) : f;
                v.sub(q).multiplyScalar(g).add(q);
                pos.setXYZ(i, v.x, v.y, v.z);
                continue;
            }
            // Le haut du pantalon (ceinture) est resserré pareil : il reste sous le haut.
            if (!(limb && top) && !/_C_(Hips|Spine|Chest|UpperChest)$/.test(bone)) continue;
            // Ventre : devant resserré, surtout entre le nombril et le bas du haut.
            const yTop = at[chest].y;
            if (v.y > yTop) continue;
            // 0 à la poitrine, 1 du ventre jusqu'en bas du haut.
            const belly = 1 - THREE.MathUtils.smoothstep(v.y, yTop - 0.14, yTop);
            const dz = v.z - axisZ;
            if (dz * front > 0) v.z = axisZ + dz * (1 - 0.18 * belly);
            // Bas du haut raccourci (il descendait jusqu'à l'entrejambe, comme une
            // robe) : sous les hanches, remonté vers la taille.
            const yHips = at[hips].y;
            if (top && v.y < yHips) v.y = yHips + (v.y - yHips) * 0.6;
            pos.setXYZ(i, v.x, v.y, v.z);
        }
        pos.needsUpdate = true;
        o.geometry.computeBoundingSphere();
    });
}

function restyle(model) {
    mergeHair(model);
    thickenNeck(model);
    tuckSkin(model);
    hideCoveredSkin(model);
    reshapeClothes(model);
    // Le haut porte déjà le gilet de jōnin peint dans sa texture ; le bas passe au bleu nuit.
    const tints = { Bottoms: '#8f9ad8' };
    // Peau un peu plus chaude (le blanc VRoid paraissait délavé sous le soleil).
    const skin = '#ffe0cc';
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
                // Lueur propre plus faible : le relief et les couleurs ressortent.
                emissiveIntensity: /SKIN|FACE|EYE/.test(name) ? 0.07 : 0.08
            });
            if (/_SKIN/.test(name)) {
                std.color.set(skin);
                std.emissive.set(skin);
            }
            Object.entries(tints).forEach(([k, c]) => {
                if (!name.includes(k)) return;
                std.color.set(c);
                std.emissive.set(c);
            });
            if (name.includes('Shoes')) std.visible = false;
            // Cheveux plus sombres, presque noirs, comme ceux des Hyûga.
            if (/HAIR/.test(name)) {
                std.color.set('#6e5a54');
                std.emissive.set('#4a3a35');
            }
            // Byakugan : l'iris des Hyûga, pâle et sans pupille, qui s'illumine à l'activation.
            if (name.includes('EyeIris')) {
                std.map = null;
                std.emissiveMap = null;
                std.color.set('#ece8f6');
                std.emissive.set('#c9c0ff');
                std.emissiveIntensity = 0.12;
                (model.userData.iris ||= []).push(std);
            }
            return std;
        };
        o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material);
    });
}

// Positions des os au repos (modèle tourné face à +Z), pour caler le squelette
// d'animation sur les proportions du modèle.
// Proportions : le modèle VRoid avait le haut du bras plus court que
// l'avant-bras, la cuisse plus courte que le tibia, des épaules étroites et une
// grosse tête (5,9 têtes de haut). On déplace les os (le maillage suit par
// le skinning) avant de mesurer le squelette.
function adjustProportions(model) {
    if (model.userData.proportioned) return;
    model.userData.proportioned = true;
    const scale = (name, f) => { const b = model.getObjectByName(name); if (b) b.position.multiplyScalar(f); };
    const foot = model.getObjectByName('J_Bip_L_Foot');
    const hips = model.getObjectByName('J_Bip_C_Hips');
    model.updateMatrixWorld(true);
    const footBefore = foot ? foot.getWorldPosition(new THREE.Vector3()).y : 0;
    ['L', 'R'].forEach((s) => {
        scale(`J_Bip_${s}_UpperArm`, 1.3);  // épaules un peu plus larges
        scale(`J_Bip_${s}_LowerArm`, 1.18); // haut du bras : 22 → 26 cm
        scale(`J_Bip_${s}_Hand`, 0.98);     // avant-bras : 25 → 24,5 cm
        scale(`J_Bip_${s}_LowerLeg`, 1.12); // cuisse : 39 → 43 cm
        scale(`J_Bip_${s}_Foot`, 0.95);     // tibia : 46 → 43 cm
    });
    const head = model.getObjectByName('J_Bip_C_Head');
    if (head) {
        head.scale.setScalar(0.93); // tête un peu plus petite (~6,4 têtes)
        head.position.multiplyScalar(0.85); // cou moins long (9 → 7,6 cm)
    }
    model.updateMatrixWorld(true);
    // Jambes plus longues : le bassin remonte d'autant, les pieds restent au sol.
    if (foot && hips) {
        hips.position.y += footBefore - foot.getWorldPosition(new THREE.Vector3()).y;
        model.updateMatrixWorld(true);
    }
}

export function measureAvatar(gltf) {
    const model = gltf.scene;
    const R = rigOf(model);
    if (R === RIGS.vrm) adjustProportions(model);
    model.rotation.y = R.facing;
    model.updateMatrixWorld(true);
    const at = (name) => {
        const b = model.getObjectByName(name);
        return b ? b.getWorldPosition(new THREE.Vector3()) : null;
    };
    return {
        hips: at(R.hips), spine: at(R.spine), neck: at(R.neck), head: at(R.head),
        arm: at(R.armL), elbow: at(R.foreL), hand: at(R.handL),
        leg: at(R.legL), knee: at(R.kneeL), foot: at(R.footL)
    };
}

// Modèle Higgsfield : un seul maillage texturé (tenue, bandeau, sandales déjà
// peints). Ombres, et la même petite lueur propre que l'ancien modèle (rendu anime).
function restyleGlb(model) {
    model.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const m = o.material;
        m.roughness = 0.8;
        m.metalness = 0;
        m.emissive = new THREE.Color('#ffffff');
        m.emissiveMap = m.map;
        m.emissiveIntensity = 0.08;
    });
}

// Byakugan sur le modèle Higgsfield (yeux peints dans la texture) : deux halos
// pâles posés sur les yeux, invisibles au repos, qui s'allument à l'activation.
// Centre des yeux dans le repère de l'os « Head » (en cm : l'armature est à
// l'échelle 0,01), mesuré par lancer de rayons sur akira.glb. Attention : cet os
// est à la base du crâne, ~10 cm sous les yeux.
const EYES = [[-3.39, 10.1, 9.6], [3.37, 10.5, 9.0]];
function eyeGlow(model, head) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(222,214,255,0.75)');
    g.addColorStop(1, 'rgba(160,150,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    const k = 1 / head.getWorldScale(new THREE.Vector3()).x;
    return EYES.map(([x, y, z]) => {
        const m = new THREE.SpriteMaterial({ map: tex, color: '#e6e0ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
        const sp = new THREE.Sprite(m);
        sp.scale.setScalar(0.028 * k);
        sp.position.set(x, y, z);
        head.add(sp);
        return m;
    });
}

/*
 * Reciblage : chaque os du modèle suit l'orientation (monde) d'une articulation
 * de ninja.js, à un décalage près calculé une fois, les deux squelettes au repos.
 * Le côté gauche de ninja.js est en x < 0 : c'est le côté droit du personnage.
 */
export function bindAvatar(gltf, J, parent) {
    const model = gltf.scene;
    const R = rigOf(model);
    if (R === RIGS.vrm) restyle(model);
    else restyleGlb(model);
    // Pas de capuche sous le gilet de jōnin : on replie ses os.
    ['J_Sec_C_Hood', 'J_Sec_L_HoodString1', 'J_Sec_R_HoodString1'].forEach((n) => {
        const b = model.getObjectByName(n);
        if (b) b.scale.setScalar(0.02);
    });
    model.rotation.y = R.facing;
    parent.add(model);
    const bone = (name) => model.getObjectByName(name);
    const pairs = [
        [J.hips, R.hips],
        [J.spine, R.spine],
        [J.neck, R.neck],
        [J.head, R.head],
        [J.shoulderL, R.armR, J.elbowL, R.foreR],
        [J.elbowL, R.foreR, J.handL, R.handR],
        [J.handL, R.handR],
        [J.shoulderR, R.armL, J.elbowR, R.foreL],
        [J.elbowR, R.foreL, J.handR, R.handL],
        [J.handR, R.handL],
        [J.hipL, R.legR, J.kneeL, R.kneeR],
        [J.kneeL, R.kneeR, J.footL, R.footR],
        [J.footL, R.footR],
        [J.hipR, R.legL, J.kneeR, R.kneeL],
        [J.kneeR, R.kneeL, J.footR, R.footL],
        [J.footR, R.footL]
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
    const expressions = { blink: morph('Blink'), wink: morph('Blink_R'), angry: morph('Angry'), joy: morph('Joy'), fun: morph('Fun') };

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

    const glow = R === RIGS.glb ? eyeGlow(model, pairs.find((p) => p.joint === J.head).bone) : [];

    // Clips Higgsfield (modèle GLB seulement) : chaque os du modèle prend la
    // rotation de l'os du clip par rapport à sa pose de repos (repère du maillage),
    // en fondu par-dessus la pose de ninja.js.
    const clips = {};
    const skinned = [];
    model.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
    const skinMesh = skinned[0];
    const restB = new Map();
    const order = [];
    if (R === RIGS.glb && skinMesh) {
        const m4 = new THREE.Matrix4();
        const dummy = new THREE.Vector3();
        skinMesh.skeleton.bones.forEach((bn, i) => {
            const q = new THREE.Quaternion();
            m4.copy(skinMesh.skeleton.boneInverses[i]).invert().decompose(dummy, q, new THREE.Vector3());
            restB.set(bn.name, q.normalize());
        });
        model.traverse((o) => { if (o.isBone && restB.has(o.name)) order.push(o); });
        loadClips().then((all) => {
            Object.entries(all).forEach(([name, g]) => {
                const rest = (g.scene.userData && g.scene.userData.rest) || {};
                const frame = g.scene.getObjectByName('char1') || g.scene.getObjectByName('Armature') || g.scene;
                const mixer = new THREE.AnimationMixer(g.scene);
                const action = mixer.clipAction(g.animations[0]);
                action.play();
                const bones = new Map();
                g.scene.traverse((o) => { if (rest[o.name]) bones.set(o.name, { node: o, rest: new THREE.Quaternion(...rest[o.name].q).normalize() }); });
                const hipsNode = bones.get('Hips') && bones.get('Hips').node;
                // Position des hanches au début du clip (on n'en garde que le mouvement relatif).
                mixer.setTime(0);
                g.scene.updateMatrixWorld(true);
                // (en mètres, repère de la scène du clip : l'armature est à l'échelle 0,01)
                const hips0 = hipsNode ? hipsNode.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3();
                clips[name] = { mixer, duration: g.animations[0].duration, frame, bones, hipsNode, hips0, scene: g.scene };
            });
        });
    }
    const cq = new THREE.Quaternion();
    const fq = new THREE.Quaternion();
    const bfq = new THREE.Quaternion();
    const tq = new THREE.Quaternion();
    const lq = new THREE.Quaternion();
    const hv = new THREE.Vector3();
    let current = null;
    function applyClip() {
        if (!current || current.weight <= 0) return;
        const c = clips[current.name];
        if (!c) return;
        c.mixer.setTime(Math.max(0, Math.min(current.time, c.duration - 1e-3)));
        c.scene.updateMatrixWorld(true);
        c.frame.getWorldQuaternion(fq).invert();
        skinMesh.getWorldQuaternion(bfq);
        const w = Math.min(1, current.weight);
        order.forEach((bn) => {
            const cb = c.bones.get(bn.name);
            if (!cb) return;
            // Rotation du clip dans le repère de son maillage, rapportée au repos
            // du clip puis appliquée au repos du modèle.
            cb.node.getWorldQuaternion(cq);
            tq.copy(fq).multiply(cq).multiply(lq.copy(cb.rest).invert()).multiply(restB.get(bn.name));
            tq.premultiply(bfq);
            bn.parent.getWorldQuaternion(lq).invert();
            lq.multiply(tq);
            bn.quaternion.slerp(lq, w);
            bn.updateMatrixWorld(true);
        });
        // Hanches : mouvement vertical du clip (accroupi, sauts) et un peu de
        // déplacement horizontal (le personnage reste à sa place dans la mise en scène).
        if (c.hipsNode) {
            c.hipsNode.getWorldPosition(hv).sub(c.hips0).applyQuaternion(fq);
            hv.x *= 0.3;
            hv.z *= 0.3;
            hv.applyQuaternion(bfq).multiplyScalar(model.scale.x * w);
            hips.parent.worldToLocal(hv.add(hips.getWorldPosition(new THREE.Vector3())));
            hips.position.copy(hv);
        }
        model.updateMatrixWorld(true);
    }
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
        // Byakugan activé (0 → 1) : les yeux s'illuminent.
        byakugan(k) {
            (model.userData.iris || []).forEach((m) => { m.emissiveIntensity = 0.12 + k * 1.4; });
            glow.forEach((m) => { m.opacity = Math.min(1, k * 1.2); });
        },
        // Clip Higgsfield à l'instant `time` (s), en fondu `weight` (0 → pose de
        // ninja.js, 1 → clip seul) ; name = null pour arrêter. Durées : clipDuration.
        setClip(name, time = 0, weight = 1) { current = name && clips[name] ? { name, time, weight } : null; },
        clipDuration(name) { return clips[name] ? clips[name].duration : 0; },
        // « vrm » (ancien modèle VRoid, équipé par ninja.js) ou « glb » (modèle Higgsfield, déjà équipé).
        kind: R === RIGS.vrm ? 'vrm' : 'glb',
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
            applyClip();
        }
    };
}
