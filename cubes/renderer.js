"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const THREE = require("three");
const TrackballControls_1 = require("three/examples/jsm/controls/TrackballControls");
const TextGeometry_1 = require("three/examples/jsm/geometries/TextGeometry");
const FontLoader_1 = require("three/examples/jsm/loaders/FontLoader");
const gsap_1 = require("gsap");
const dat_gui_1 = require("dat.gui");
const BoxGeometryEnh_1 = require("./BoxGeometryEnh");
const RGBELoader_1 = require("three/examples/jsm/loaders/RGBELoader");
const cubeDiv = document.getElementById('container');
let scene;
let camera;
let controls;
let renderer;
let gui;
let baseGroup;
let tumble = false;
let isShowNumbers = false;
let showAxes = false;
let showRotationInfos = false;
let isWireframe = false;
let isHideNext = false;
let is2x2 = false;
let isMirrorCube = false;
let isPyraShape = false;
let isPyraColors = false;
let isMirrorColors = false;
let testIndex = 0;
let isShowOneCube = false;
let isViewRight = true;
let viewUp = 1;
let isNormals = false;
let isGold = false;
const cubeSize = 0.98;
const cubeStep = 1;
const roughness = 0.2;
const objectWidth = 6.5;
const objectHeight = 6.5;
let numAnims = 0; // number of running rotation animations (one for each cube piece)
let morphDuration = 0; // duration of rotation animation in seconds
let fixedPieces = []; // the list of pieces, not changed by rotations
let rotPieces = []; // the list of pieces, changed by rotations
let infoGroups = [];
let opsHistory = []; // the list of operations performed
let opsHistoryIndex = -1; // the index of the last operation in the history
let opsTodo = []; // the list of operations to perform automatically
const basicMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: roughness }), // right  red     0
    new THREE.MeshStandardMaterial({ color: 0xFFB700, roughness: roughness }), // left   orange  1
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: roughness }), // top    white   2
    new THREE.MeshStandardMaterial({ color: 0xffff00, roughness: roughness }), // bottom yellow  3
    new THREE.MeshStandardMaterial({ color: 0x00ff00, roughness: roughness }), // front  green   4
    new THREE.MeshStandardMaterial({ color: 0x0080ff, roughness: roughness }) // back   blue    5
];
const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x202020, roughness: roughness });
const grayMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: roughness });
const wireframeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, wireframe: true });
let silverMaterial;
let goldMaterial;
let mirrorMaterials;
function init() {
    if (cubeDiv.parentElement === null) {
        console.log("cubeDiv not found, parentElement is null");
    }
    const aspect = cubeDiv.clientWidth / cubeDiv.clientHeight;
    const fov = 60;
    camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    // Calculate the initial distance and set the camera position
    const initialDistance = calculateDistanceToFitObject(camera, objectWidth, objectHeight);
    camera.position.z = initialDistance;
    scene = new THREE.Scene();
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(cubeDiv.clientWidth, cubeDiv.clientHeight);
    cubeDiv.appendChild(renderer.domElement);
    var bgColor = cubeDiv.getAttribute('data-bg-color');
    renderer.setClearColor(bgColor ? bgColor : 0xb0c4de); // Light blue-gray color in hexadecimal
    baseGroup = new THREE.Group();
    scene.add(baseGroup);
    const loader = new RGBELoader_1.RGBELoader();
    // loader.load('textures/autumn_field_puresky_1k.hdr', function (texture) {
    loader.load('textures/rosendal_plains_2_1k.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        // scene.background = texture; // Optional: Set the background to the environment map
        // Update the silver material to use the environment map
        silverMaterial = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            roughness: 0.05, // Lower roughness for a shinier surface
            metalness: 1.0, // High metalness for a metallic look
            envMap: texture, // Apply the environment map
            envMapIntensity: 1.0 // Ensure environment map intensity is set
        });
        goldMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700, // Gold color
            roughness: 0.05, // Lower roughness for a shinier surface
            metalness: 1.0, // High metalness for a metallic look
            envMap: texture, // Apply the environment map
            envMapIntensity: 1.0 // Ensure environment map intensity is set
        });
        mirrorMaterials = [silverMaterial, silverMaterial, silverMaterial, silverMaterial, silverMaterial, silverMaterial];
        init1();
    });
}
function init1() {
    createMain(cubeDiv.getAttribute('data-shape'));
    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.visible = showAxes;
    baseGroup.add(axesHelper);
    gui = setupGui();
    gui.domElement.id = 'gui';
    cubeDiv.append(gui.domElement);
    // Initial camera update
    updateCamera(camera, objectWidth, objectHeight);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    controls = new TrackballControls_1.TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 2.0;
    controls.keys = ['KeyA', 'KeyW', 'KeyQ'];
    resetView();
    controls.update();
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);
    createDirLight(-5, 0, 2);
    createDirLight(5, 0, 2);
    createDirLight(0, -5, 2);
    createDirLight(0, 5, 2);
    createDirLight(0, 0, -2);
    // camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    animate();
}
function animate() {
    requestAnimationFrame(animate);
    if (tumble) {
        baseGroup.rotation.x += 0.01;
        baseGroup.rotation.y += 0.01;
        baseGroup.rotation.z += 0.01;
        baseGroup.updateMatrix();
    }
    controls.update();
    renderer.render(scene, camera);
}
let mouseDown = false;
let initialPoint = null;
let isPoint = new THREE.Vector3();
let selCube = null;
let selFace = null;
let selRot = "";
function majorAxis(vector) {
    const x = Math.abs(vector.x);
    const y = Math.abs(vector.y);
    const z = Math.abs(vector.z);
    if (x > y && x > z) {
        return (vector.x > 0 ? "" : "-") + "x";
    }
    else if (y > x && y > z) {
        return (vector.y > 0 ? "" : "-") + "y";
    }
    else {
        return (vector.z > 0 ? "" : "-") + "z";
    }
}
function f2dec2(value) {
    return value.toFixed(2);
}
function onDrag(event) {
    const rect = cubeDiv.getBoundingClientRect();
    const evx = event.clientX - rect.left;
    const evy = event.clientY - rect.top;
    const mouse = new THREE.Vector2((evx / cubeDiv.clientWidth) * 2 - 1, -(evy / cubeDiv.clientHeight) * 2 + 1);
    // console.log("client: " + evx + " " + evy + " mouse: " + mouse.x + " " + mouse.y)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(baseGroup.children);
    for (let i = 0; i < intersects.length; i++) {
        const isInfo = intersects[i];
        const obj = isInfo.object;
        if (obj instanceof THREE.Mesh) {
            if (obj.name === "box") {
                // if object parent is not null
                if (obj.parent !== null && obj.parent.visible) {
                    isMovingObject = true;
                    controls.enabled = false;
                    selCube = obj.parent;
                    // console.log("box clicked " + obj.name + " fi=" + isInfo.faceIndex + " (" + selCube.position.x + " " + selCube.position.y + " " + selCube.position.z + ")");          
                    selFace = isInfo.face;
                    isPoint = isInfo.point;
                    // isPoint translated to local coordinates of baseGroup
                    let modelViewInverse = baseGroup.matrixWorld.clone().invert();
                    isPoint.applyMatrix4(modelViewInverse);
                    // const orgNormal = selFace.normal.clone();
                    const groupNormal = selFace.normal.clone().applyMatrix4(selCube.matrix).normalize();
                    // const pieceIndex = getPieceIndex(selCube);
                    // console.log("idx: " + pieceIndex + " p: " + f2dec2(selCube.position.x) + " " + f2dec2(selCube.position.y) + " " + f2dec2(selCube.position.z) + 
                    //   " n: " + f2dec2(groupNormal.x) + " " + f2dec2(groupNormal.y) + " " + f2dec2(groupNormal.z));
                    // console.log("orgNormal: " + f2dec2(orgNormal.x) + " " + f2dec2(orgNormal.y) + " " + f2dec2(orgNormal.z));
                    // const iom = obj.material;
                    // for (let j = 0; j < iom.length; j++) {
                    //   iom[j] = grayMaterial;
                    // }
                    // showAll(false);
                    obj.parent.visible = true;
                    if (initialPoint !== null) {
                        const diff = isPoint.clone().sub(initialPoint);
                        if (isPyraShape) {
                            let rot = getPyraRotationBySelection(selCube.position.x, selCube.position.y, selCube.position.z, initialPoint, isPoint);
                            // console.log("rot: " + rot);
                            selRot = rot;
                        }
                        else {
                            // console.log("groupNormal: " + groupNormal.x + " " + groupNormal.y + " " + groupNormal.z);
                            let dragDir = majorAxis(diff);
                            let faceDir = majorAxis(groupNormal);
                            // task major drag axis and normal on face, then lookup rotation
                            let rot = getRotationBySelection(selCube.position.x, selCube.position.y, selCube.position.z, faceDir, dragDir);
                            // console.log("normalDir: " + faceDir, " dragDir: " + dragDir + " rot: " + rot);
                            selRot = rot;
                        }
                    }
                    break;
                }
            }
        }
    }
}
// get index of piece in the rotPieces array
function getPieceIndex(piece) {
    for (let i = 0; i < rotPieces.length; i++) {
        if (rotPieces[i] === piece) {
            return i;
        }
    }
    return -1;
}
let isMovingObject = false;
function onPointerDown(event) {
    // console.log("event: " + event.clientX + " " + event.clientY);
    mouseDown = true;
    onDrag(event);
    initialPoint = isPoint.clone();
}
function onPointerMove(event) {
    if (isMovingObject) {
        onDrag(event);
    }
}
function onPointerUp(event) {
    if (!mouseDown)
        return;
    if (isMovingObject) {
        isMovingObject = false;
        controls.enabled = true;
        if (selRot !== "") {
            rotate(selRot);
        }
    }
    mouseDown = false;
    initialPoint = null;
    selCube = null;
    selFace = null;
    selRot = "";
}
function createDirLight(x, y, z) {
    const light = new THREE.DirectionalLight(0xFFFFFF, 2);
    light.position.set(x, y, z);
    scene.add(light);
    return light;
}
function createMain(shape = null) {
    createAllCubes();
    if (shape === "pyramorphix") {
        scaleTo2x2(true, 0)
            .then(() => morphToPyra(true, 0))
            .then(() => setAllPyraColors());
    }
    else if (shape === "2x2") {
        scaleTo2x2(true, 0);
    }
    // createPyraFaceLines();
    //createBeveledCube();
}
function createBeveledCube() {
    // Create a square shape with a beveled edge
    const bevel = 0.05;
    const ih = 0.5 - bevel; // inner half of the side
    const oh = 0.5; // outer half of the side
    const shape = new THREE.Shape();
    shape.moveTo(-ih, -oh);
    shape.lineTo(ih, -oh);
    shape.absarc(ih, -ih, bevel, -Math.PI / 2, 0, false);
    shape.lineTo(oh, ih);
    shape.absarc(ih, ih, bevel, 0, Math.PI / 2, false);
    shape.lineTo(-ih, oh);
    shape.absarc(-ih, ih, bevel, Math.PI / 2, Math.PI, false);
    shape.lineTo(-oh, -ih);
    shape.absarc(-ih, -ih, bevel, Math.PI, Math.PI * 3 / 2, false);
    const extrudeSettings = {
        steps: 1,
        depth: 1 - bevel * 2,
        bevelEnabled: true,
        bevelThickness: 0.1,
        bevelSize: bevel,
        bevelOffset: 0,
        bevelSegments: 3
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(3, 0, 0);
    scene.add(cube);
}
function resetMain() {
    rotPieces.forEach((piece) => {
        baseGroup.remove(piece);
        piece.children.forEach((child) => {
            disposeMesh(child);
        });
    });
    opsHistory = [];
    opsHistoryIndex = -1;
    opsTodo = [];
    is2x2 = false;
    isPyraShape = false;
    isPyraColors = false;
    isMirrorCube = false;
    isMirrorColors = false;
    createMain();
}
function toggleAxes() {
    showAxes = !showAxes;
    baseGroup.children.forEach((child) => {
        if (child instanceof THREE.AxesHelper) {
            child.visible = showAxes;
        }
    });
}
function toggleShowOneCube() {
    isShowOneCube = !isShowOneCube;
    fixedPieces.forEach((piece, index) => {
        piece.visible = isShowOneCube ? (index === testIndex) : true;
    });
}
function showAll(show) {
    fixedPieces.forEach((piece, index) => {
        piece.visible = show;
    });
}
function toggleRotationInfos() {
    showRotationInfos = !showRotationInfos;
    createRotationInfos(showRotationInfos, false);
}
function toggleWireframe() {
    isWireframe = !isWireframe;
    setAllCubeFaces();
}
function toggleNumbers() {
    isWireframe = false;
    isShowNumbers = !isShowNumbers;
    setAllCubeFaces();
}
const selectionToRotation = [
    // left side, up direction
    { px: -1, py: 99, pz: -1, normalMajor: "-x", dragMajor: "y", rot: "B" },
    { px: -1, py: 99, pz: 0, normalMajor: "-x", dragMajor: "y", rot: "s" },
    { px: -1, py: 99, pz: 1, normalMajor: "-x", dragMajor: "y", rot: "f" },
    // right side, up direction
    { px: 1, py: 99, pz: -1, normalMajor: "x", dragMajor: "y", rot: "b" },
    { px: 1, py: 99, pz: 0, normalMajor: "x", dragMajor: "y", rot: "S" },
    { px: 1, py: 99, pz: 1, normalMajor: "x", dragMajor: "y", rot: "F" },
    // front side, up direction
    { px: -1, py: 99, pz: 1, normalMajor: "z", dragMajor: "y", rot: "L" },
    { px: 0, py: 99, pz: 1, normalMajor: "z", dragMajor: "y", rot: "M" },
    { px: 1, py: 99, pz: 1, normalMajor: "z", dragMajor: "y", rot: "r" },
    // back side, up direction
    { px: -1, py: 99, pz: -1, normalMajor: "-z", dragMajor: "y", rot: "l" },
    { px: 0, py: 99, pz: -1, normalMajor: "-z", dragMajor: "y", rot: "m" },
    { px: 1, py: 99, pz: -1, normalMajor: "-z", dragMajor: "y", rot: "R" },
    // top side, back-to-front direction
    { px: -1, py: 1, pz: 99, normalMajor: "y", dragMajor: "z", rot: "l" },
    { px: 0, py: 1, pz: 99, normalMajor: "y", dragMajor: "z", rot: "m" },
    { px: 1, py: 1, pz: 99, normalMajor: "y", dragMajor: "z", rot: "R" },
    // underside, back-to-front direction
    { px: -1, py: -1, pz: 99, normalMajor: "-y", dragMajor: "z", rot: "L" },
    { px: 0, py: -1, pz: 99, normalMajor: "-y", dragMajor: "z", rot: "M" },
    { px: 1, py: -1, pz: 99, normalMajor: "-y", dragMajor: "z", rot: "r" },
    // left side, back-to-front direction
    { px: -1, py: -1, pz: 99, normalMajor: "-x", dragMajor: "z", rot: "d" },
    { px: -1, py: 0, pz: 99, normalMajor: "-x", dragMajor: "z", rot: "e" },
    { px: -1, py: 1, pz: 99, normalMajor: "-x", dragMajor: "z", rot: "U" },
    // right side, back-to-front direction
    { px: 1, py: -1, pz: 99, normalMajor: "x", dragMajor: "z", rot: "D" },
    { px: 1, py: 0, pz: 99, normalMajor: "x", dragMajor: "z", rot: "E" },
    { px: 1, py: 1, pz: 99, normalMajor: "x", dragMajor: "z", rot: "u" },
    // front side, left-to-right direction
    { px: 99, py: -1, pz: 1, normalMajor: "z", dragMajor: "x", rot: "d" },
    { px: 99, py: 0, pz: 1, normalMajor: "z", dragMajor: "x", rot: "e" },
    { px: 99, py: 1, pz: 1, normalMajor: "z", dragMajor: "x", rot: "U" },
    // back side, left-to-right direction
    { px: 99, py: -1, pz: -1, normalMajor: "-z", dragMajor: "x", rot: "D" },
    { px: 99, py: 0, pz: -1, normalMajor: "-z", dragMajor: "x", rot: "E" },
    { px: 99, py: 1, pz: -1, normalMajor: "-z", dragMajor: "x", rot: "u" },
    // top side, left-to-right direction
    { px: 99, py: 1, pz: -1, normalMajor: "y", dragMajor: "x", rot: "B" },
    { px: 99, py: 1, pz: 0, normalMajor: "y", dragMajor: "x", rot: "s" },
    { px: 99, py: 1, pz: 1, normalMajor: "y", dragMajor: "x", rot: "f" },
    // underside, left-to-right direction
    { px: 99, py: -1, pz: -1, normalMajor: "-y", dragMajor: "x", rot: "b" },
    { px: 99, py: -1, pz: 0, normalMajor: "-y", dragMajor: "x", rot: "S" },
    { px: 99, py: -1, pz: 1, normalMajor: "-y", dragMajor: "x", rot: "F" },
];
function getRotationBySelection(x, y, z, normalMajor, dragMajor) {
    const dragReverse = dragMajor[0] === '-';
    const dragMajorAbs = dragReverse ? dragMajor.substring(1) : dragMajor;
    for (let i = 0; i < selectionToRotation.length; i++) {
        const sel = selectionToRotation[i];
        if ((sel.px === Math.round(x) || sel.px === 99) && (sel.py === Math.round(y) || sel.py === 99) && (sel.pz === Math.round(z) || sel.pz === 99)
            && sel.normalMajor === normalMajor && sel.dragMajor === dragMajorAbs) {
            let rot = sel.rot;
            const rotReverse = (rot === rot.toUpperCase());
            rot = rot.toLowerCase();
            if (dragReverse != rotReverse) {
                rot = rot.toUpperCase();
            }
            return rot;
        }
    }
    return "";
}
const pyraSelectionToRotation = [
    { px: -1, py: 99, pz: 99, dir: "x", rot: "L" },
    { px: 1, py: 99, pz: 99, dir: "x", rot: "r" },
    { px: 99, py: -1, pz: 99, dir: "y", rot: "D" },
    { px: 99, py: 1, pz: 99, dir: "y", rot: "u" },
    { px: 99, py: 99, pz: -1, dir: "z", rot: "B" },
    { px: 99, py: 99, pz: 1, dir: "z", rot: "f" },
];
function getAngleDiff(x1, y1, x2, y2) {
    const angle1 = Math.atan2(y1, x1);
    const angle2 = Math.atan2(y2, x2);
    let diff = angle2 - angle1;
    if (diff > Math.PI) {
        diff -= Math.PI * 2;
    }
    else if (diff < -Math.PI) {
        diff += Math.PI * 2;
    }
    return diff;
}
function getPyraRotationBySelection(px, py, pz, dragStart, dragEnd) {
    const diff = dragEnd.clone().sub(dragStart);
    const ax = Math.abs(diff.x);
    const ay = Math.abs(diff.y);
    const az = Math.abs(diff.z);
    // dragging on one face or multiple with same normal, one axis is almost zero
    // take this and angle difference to determine rotation
    let dir = "";
    let angleDiff = 0;
    if (az < ax && az < ay) {
        dir = "z";
        angleDiff = getAngleDiff(dragStart.y, dragStart.x, dragEnd.y, dragEnd.x);
    }
    else if (ay < ax) {
        dir = "y";
        angleDiff = getAngleDiff(-dragStart.z, dragStart.x, -dragEnd.z, dragEnd.x);
    }
    else {
        dir = "x";
        angleDiff = getAngleDiff(dragStart.y, -dragStart.z, dragEnd.y, -dragEnd.z);
    }
    // console.log("p=" + f2dec2(px) + " " + f2dec2(py) + " " + f2dec2(pz) + " dir: " + dir + " angleDiff: " + angleDiff * 180 / Math.PI );
    for (let i = 0; i < pyraSelectionToRotation.length; i++) {
        const sel = pyraSelectionToRotation[i];
        if ((sel.px === Math.round(px) || sel.px === 99) && (sel.py === Math.round(py) || sel.py === 99) && (sel.pz === Math.round(pz) || sel.pz === 99)
            && sel.dir === dir) {
            let rot = sel.rot;
            const rotReverse = (rot === rot.toUpperCase());
            rot = rot.toLowerCase();
            if ((angleDiff < 0) != rotReverse) {
                rot = rot.toUpperCase();
            }
            // console.log("rot: " + rot);
            return rot;
        }
    }
    console.log("no rot found");
    return "";
}
// this list describes for a cube what position indexes are used at each corner to draw the lines, to allow for morphing.
// each row denotes a corner (x + x*2 + z*4), the values are the indexes in the position array (of BoxGeometry)
// for BoxGeometryEnh actual indexes values are (value * 2) and (value * 2 + 1), b/c each point is duplicated to avoid interpolated normals
const meshCornerLinePositions = [
    [6, 14, 23], // 0
    [3, 15, 22], // 1
    [4, 8, 21], // 2
    [1, 9, 20], // 3
    [7, 12, 18], // 4
    [2, 13, 19], // 5
    [5, 10, 16], // 6
    [0, 11, 17], // 7
];
// morph modifications for the cube indices which form the 2x2x2 cube to morph to a pyramorphix.
// The idx values are the corner points of the cube with idx = x+y*2+z*4. The vectors are the new values to apply to the points.
const oneSixth = 1 / 6;
const morphMods = {};
morphMods[0] = [{ idx: 1, x: 99, y: 0, z: 0 }, { idx: 2, x: 0, y: 99, z: 0 }, { idx: 4, x: 0, y: 0, z: 99 }, { idx: 0, x: oneSixth, y: oneSixth, z: oneSixth }];
morphMods[1] = [{ idx: 0, x: 99, y: 0, z: 0 }, { idx: 1, x: 99, y: 0, z: 0 }];
morphMods[2] = [{ idx: 0, x: 99, y: 0, z: 0 }, { idx: 3, x: 0, y: 99, z: 0 }, { idx: 5, x: 0, y: 0, z: 99 }];
morphMods[3] = [{ idx: 2, x: 0, y: 99, z: 0 }, { idx: 0, x: 0, y: 99, z: 0 }];
morphMods[5] = [{ idx: 3, x: 0, y: 99, z: 0 }, { idx: 1, x: 0, y: 99, z: 0 }];
morphMods[6] = [{ idx: 3, x: 99, y: 0, z: 0 }, { idx: 0, x: 0, y: 99, z: 0 }, { idx: 6, x: 0, y: 0, z: 99 }];
morphMods[7] = [{ idx: 2, x: 99, y: 0, z: 0 }, { idx: 3, x: 99, y: 0, z: 0 }];
morphMods[8] = [{ idx: 2, x: 99, y: 0, z: 0 }, { idx: 1, x: 0, y: 99, z: 0 }, { idx: 7, x: 0, y: 0, z: 99 }, { idx: 3, x: -oneSixth, y: -oneSixth, z: oneSixth }];
morphMods[9] = [{ idx: 4, x: 0, y: 0, z: 99 }, { idx: 0, x: 0, y: 0, z: 99 }];
morphMods[11] = [{ idx: 5, x: 0, y: 0, z: 99 }, { idx: 1, x: 0, y: 0, z: 99 }];
morphMods[15] = [{ idx: 6, x: 0, y: 0, z: 99 }, { idx: 2, x: 0, y: 0, z: 99 }];
morphMods[17] = [{ idx: 7, x: 0, y: 0, z: 99 }, { idx: 3, x: 0, y: 0, z: 99 }];
morphMods[18] = [{ idx: 5, x: 99, y: 0, z: 0 }, { idx: 6, x: 0, y: 99, z: 0 }, { idx: 0, x: 0, y: 0, z: 99 }];
morphMods[19] = [{ idx: 4, x: 99, y: 0, z: 0 }, { idx: 5, x: 99, y: 0, z: 0 }];
morphMods[20] = [{ idx: 4, x: 99, y: 0, z: 0 }, { idx: 7, x: 0, y: 99, z: 0 }, { idx: 1, x: 0, y: 0, z: 99 }, { idx: 5, x: -oneSixth, y: oneSixth, z: -oneSixth }];
morphMods[21] = [{ idx: 6, x: 0, y: 99, z: 0 }, { idx: 4, x: 0, y: 99, z: 0 }];
morphMods[23] = [{ idx: 5, x: 0, y: 99, z: 0 }, { idx: 7, x: 0, y: 99, z: 0 }];
morphMods[24] = [{ idx: 7, x: 99, y: 0, z: 0 }, { idx: 4, x: 0, y: 99, z: 0 }, { idx: 2, x: 0, y: 0, z: 99 }, { idx: 6, x: oneSixth, y: -oneSixth, z: -oneSixth }];
morphMods[25] = [{ idx: 6, x: 99, y: 0, z: 0 }, { idx: 7, x: 99, y: 0, z: 0 }];
morphMods[26] = [{ idx: 6, x: 99, y: 0, z: 0 }, { idx: 5, x: 0, y: 99, z: 0 }, { idx: 3, x: 0, y: 0, z: 99 }];
function calculateNormal(A, B, C) {
    const vector1 = new THREE.Vector3().subVectors(B, A);
    const vector2 = new THREE.Vector3().subVectors(C, A);
    const normal = new THREE.Vector3().crossVectors(vector1, vector2);
    normal.normalize(); // Normalize the vector to get a unit normal vector
    return normal;
}
// face index on cube: red     0, orange  2, white   4, yellow  6, green   8, blue    10
const pyraFaces = [
    { material: basicMaterials[0], // red
        pieces: [
            { piece: 6, faces: [2, 5] },
            { piece: 18, faces: [2, 9] },
            { piece: 24, faces: [2, 3, 8, 9, 4, 5] },
            { piece: 26, faces: [5, 9] },
            { piece: 25, faces: [8, 9, 4, 5] },
            { piece: 15, faces: [2, 3, 4, 5] },
            { piece: 21, faces: [2, 3, 8, 9] },
            { piece: 12, faces: [2] },
            { piece: 22, faces: [9] },
            { piece: 16, faces: [5] },
        ] },
    { material: basicMaterials[5], // blue
        pieces: [
            { piece: 18, faces: [8, 6] },
            { piece: 2, faces: [6, 1] },
            { piece: 20, faces: [8, 9, 0, 1, 6, 7] },
            { piece: 26, faces: [8, 1] },
            { piece: 23, faces: [8, 9, 0, 1] },
            { piece: 19, faces: [8, 9, 6, 7] },
            { piece: 11, faces: [0, 1, 6, 7] },
            { piece: 22, faces: [8] },
            { piece: 14, faces: [1] },
            { piece: 10, faces: [6] },
        ] },
    { material: basicMaterials[3], // yellow
        pieces: [
            { piece: 26, faces: [0, 4] },
            { piece: 6, faces: [4, 11] },
            { piece: 8, faces: [0, 1, 4, 5, 10, 11] },
            { piece: 2, faces: [0, 11] },
            { piece: 17, faces: [4, 5, 0, 1] },
            { piece: 7, faces: [4, 5, 10, 11] },
            { piece: 5, faces: [0, 1, 10, 11] },
            { piece: 16, faces: [4] },
            { piece: 14, faces: [0] },
            { piece: 4, faces: [11] },
        ] },
    { material: basicMaterials[4], // green
        pieces: [
            { piece: 2, faces: [10, 7] },
            { piece: 18, faces: [3, 7] },
            { piece: 0, faces: [10, 11, 2, 3, 6, 7] },
            { piece: 6, faces: [10, 3] },
            { piece: 3, faces: [10, 11, 2, 3] },
            { piece: 1, faces: [10, 11, 6, 7] },
            { piece: 9, faces: [2, 3, 6, 7] },
            { piece: 4, faces: [10] },
            { piece: 12, faces: [3] },
            { piece: 10, faces: [7] },
        ] },
];
// function createPyraFaceLines(): void {
//   pyraFaces.forEach((pyraFaceObj) => {
//     let normal = pyraFaceObj.normal;
//     let linePositions: THREE.Vector3[] = [];
//     linePositions.push(new THREE.Vector3(0, 0, 0));
//     linePositions.push(normal.multiplyScalar(5));
//     let lineGeometry = new THREE.BufferGeometry().setFromPoints(linePositions);
//     let line = new THREE.Line(lineGeometry, new THREE.MeshBasicMaterial({color: pyraFaceObj.color}));
//     baseGroup.add(line);
//   });
// }
function createGeometry(cubeIndex) {
    // special setups so that the square face triangulation diagonals meet at the focus corners, needed for the 4 pyramorphix corners
    const specialDiagFocus = new Map();
    specialDiagFocus.set(0, 1);
    specialDiagFocus.set(26, 1);
    specialDiagFocus.set(8, 3);
    specialDiagFocus.set(18, 3);
    specialDiagFocus.set(6, 2);
    specialDiagFocus.set(20, 2);
    specialDiagFocus.set(2, 4);
    specialDiagFocus.set(24, 4);
    specialDiagFocus.set(12, 2);
    specialDiagFocus.set(22, 1);
    specialDiagFocus.set(16, 1);
    specialDiagFocus.set(14, 4);
    specialDiagFocus.set(10, 3);
    const diagFocus = specialDiagFocus.get(cubeIndex) || 0;
    const geometry = new BoxGeometryEnh_1.BoxGeometryEnh(cubeSize, cubeSize, cubeSize, 1, 1, 1, diagFocus, true);
    const orgPositions = geometry.attributes.position;
    const newPositions = orgPositions.clone();
    // apply morph modifications for the cube indices which form the 2x2x2 cube to morph to a pyramorphix
    if (typeof morphMods[cubeIndex] !== 'undefined') {
        morphMods[cubeIndex].forEach((mod) => {
            // console.log("modifying idx=" + cubeIndex + "with pos: "+ mod.idx);
            meshCornerLinePositions[mod.idx].forEach((clPosition) => {
                if (mod.x !== 99) {
                    newPositions.setX(clPosition * 2, mod.x);
                    newPositions.setX(clPosition * 2 + 1, mod.x);
                }
                if (mod.y !== 99) {
                    newPositions.setY(clPosition * 2, mod.y);
                    newPositions.setY(clPosition * 2 + 1, mod.y);
                }
                if (mod.z !== 99) {
                    newPositions.setZ(clPosition * 2, mod.z);
                    newPositions.setZ(clPosition * 2 + 1, mod.z);
                }
            });
        });
        geometry.morphAttributes.position = [newPositions];
        // create normals for the modified geometry 
        const tempGeometry = new THREE.BufferGeometry();
        tempGeometry.setAttribute('position', newPositions);
        if (geometry.index) {
            tempGeometry.setIndex(geometry.index.clone());
        }
        tempGeometry.computeVertexNormals();
        geometry.morphAttributes.normal = [tempGeometry.getAttribute('normal')];
    }
    return geometry;
}
function createSingleCube(x, y, z) {
    const geometry = createGeometry((x + 1) + (y + 1) * 3 + (z + 1) * 9);
    const box = new THREE.Mesh(geometry, blackMaterial);
    box.matrixAutoUpdate = false;
    box.name = "box";
    const group = new THREE.Group();
    group.matrixAutoUpdate = false;
    group.add(box);
    group.position.set(x * cubeStep, y * cubeStep, z * cubeStep);
    group.updateMatrix();
    baseGroup.add(group);
    return group;
}
function getBox(piece) {
    const box = piece.children.filter((child) => { return child.name === "box"; })[0];
    return box !== null ? box : new THREE.Mesh();
}
// the cube model (pieces) is simply the list of cube objects sorted by z,y,x ascending
function createAllCubes() {
    rotPieces = [];
    fixedPieces = [];
    let index = 0;
    for (let z = -1; z <= 1; z++) {
        for (let y = -1; y <= 1; y++) {
            for (let x = -1; x <= 1; x++) {
                const piece = createSingleCube(x, y, z);
                piece.name = "cube" + index;
                rotPieces.push(piece);
                fixedPieces.push(piece);
                piece.visible = isShowOneCube ? (index === 26) : true;
                index++;
            }
        }
    }
    setAllCubeFaces();
}
function addNormals() {
    fixedPieces.forEach((piece) => {
        const vnh = createNormals(getBox(piece));
        piece.add(vnh);
    });
}
function removeNormals() {
    fixedPieces.forEach((piece) => {
        piece.children.forEach((pc) => {
            if (pc.name === "normals") {
                let arrowHelpers = [];
                pc.children.forEach((ah) => {
                    if (ah instanceof THREE.ArrowHelper) {
                        arrowHelpers.push(ah);
                    }
                });
                arrowHelpers.forEach((ah) => {
                    pc.remove(ah);
                    ah.dispose();
                });
            }
        });
    });
}
function setAllCubeFaces() {
    if (isWireframe) {
        setAllCubesWireframe();
    }
    else if (isShowNumbers) {
        setAllCubesNumbered();
    }
    else if (isPyraColors) {
        setAllPyraColors();
    }
    else {
        setAllCubeColors();
    }
}
function setAllCubesWireframe() {
    fixedPieces.forEach((piece) => {
        getBox(piece).material = wireframeMaterial;
    });
}
function setAllCubeColors() {
    isPyraColors = false;
    if (isWireframe || isShowNumbers) {
        return;
    }
    isShowNumbers = false;
    const maskEnabled = getMaskEnabled();
    rotPieces.forEach((piece, index) => {
        const enabled999 = maskEnabled[999];
        const enabled = (typeof enabled999 !== 'undefined') ? enabled999 : maskEnabled[index];
        getBox(piece).userData = { enabled: enabled };
    });
    for (let z = -1; z <= 1; z++) {
        for (let y = -1; y <= 1; y++) {
            for (let x = -1; x <= 1; x++) {
                const index = (x + 1) + (y + 1) * 3 + (z + 1) * 9;
                const piece = fixedPieces[index];
                const box = getBox(piece);
                const enabled = box.userData.enabled;
                // console.log("index: " + index + " enabled: " + enabled);
                const materials = [];
                for (let i = 0; i < 12; i++) {
                    materials.push(blackMaterial);
                }
                if (enabled) {
                    setCubeFaceColor(materials, x, 1, 0, enabled);
                    setCubeFaceColor(materials, y, 3, 2, enabled);
                    setCubeFaceColor(materials, z, 5, 4, enabled);
                }
                box.material = materials;
            }
        }
    }
}
function setCubeFaceColor(materials, index, i1, i2, enabled) {
    var _a, _b;
    const enabled1 = enabled.all || ((_a = enabled.faces) === null || _a === void 0 ? void 0 : _a.includes(i1));
    const enabled2 = enabled.all || ((_b = enabled.faces) === null || _b === void 0 ? void 0 : _b.includes(i2));
    const sourceMaterials = isMirrorColors ? mirrorMaterials : basicMaterials;
    if (index === -1 && enabled1) {
        materials[i1 * 2] = sourceMaterials[i1];
        materials[i1 * 2 + 1] = sourceMaterials[i1];
    }
    else if (index === 1 && enabled2) {
        materials[i2 * 2] = sourceMaterials[i2];
        materials[i2 * 2 + 1] = sourceMaterials[i2];
    }
}
function setAllPyraColors() {
    isPyraColors = true;
    if (isWireframe || isShowNumbers) {
        return;
    }
    isShowNumbers = false;
    const initialMaterials = [];
    for (let i = 0; i < 12; i++) {
        initialMaterials.push(blackMaterial);
    }
    fixedPieces.forEach((piece) => {
        getBox(piece).material = initialMaterials;
    });
    pyraFaces.forEach((pyraFaceObj) => {
        pyraFaceObj.pieces.forEach((pieceObj) => {
            const box = getBox(fixedPieces[pieceObj.piece]);
            if (box.material instanceof Array) {
                const materials = box.material.slice();
                for (let i = 0; i < 12; i++) {
                    materials.push(blackMaterial);
                }
                pieceObj.faces.forEach((face) => {
                    materials[face] = pyraFaceObj.material;
                });
                box.material = materials;
            }
        });
    });
}
function setAllCubesNumbered() {
    rotPieces.forEach((piece, index) => {
        // Create a canvas and draw the index number on it
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
            context.fillStyle = 'lightblue';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.font = '64px Arial';
            context.fillStyle = 'black';
            context.fillText(index.toString(), canvas.width / 2, canvas.height / 2);
        }
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: roughness });
        const box = getBox(piece);
        box.material = mat;
    });
}
function createRotationInfoGroup(font, key, inverse, x, y, z, rotDegrees, rotAxis) {
    const group = new THREE.Group();
    group.add(createOneRotationLetter(font, key, inverse, x, y, z, rotDegrees, rotAxis));
    group.add(createRotationArrow(inverse));
    group.scale.set(0.5, 0.5, 0.5);
    group.position.set(x * 1.6, y * 1.6, z * 1.6);
    group.rotateOnAxis(rotAxis, rotDegrees * Math.PI / 180);
    baseGroup.add(group);
    infoGroups.push(group);
}
function createOneRotationLetter(font, key, inverse, x, y, z, rotDegrees, rotAxis) {
    const geometry = new TextGeometry_1.TextGeometry(key + (inverse ? "'" : ""), {
        font: font, size: 1, depth: 0.1,
        //     curveSegments: 12, bevelEnabled: true, bevelThickness: 10, bevelSize: 8, bevelOffset: 0, bevelSegments: 5
    });
    geometry.center();
    const material = new THREE.MeshStandardMaterial({ color: 0x1f1fff, roughness: roughness, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
}
function createRotationArrow(inverse) {
    const endAngle = 90 * Math.PI / 180;
    const outerRadius = 1;
    const thickness = 0.1;
    const arrowHeadSize = 0.2;
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, endAngle, false);
    shape.absarc(0, 0, outerRadius - thickness, endAngle, 0, true);
    shape.lineTo(outerRadius - arrowHeadSize - thickness / 2, 0);
    shape.lineTo(outerRadius - thickness / 2, -arrowHeadSize);
    shape.lineTo(outerRadius + arrowHeadSize - thickness / 2, 0);
    const extrudeSettings = {
        steps: 1, depth: thickness, bevelEnabled: false, bevelThickness: 0.2, bevelSize: 0.2, bevelOffset: 0, bevelSegments: 1
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({ color: 0x1f1fff, roughness: roughness, transparent: true, opacity: 0.8, wireframe: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.z = 45 * Math.PI / 180;
    if (inverse) {
        mesh.rotation.y = 180 * Math.PI / 180;
    }
    return mesh;
}
function disposeMesh(mesh) {
    if (mesh instanceof THREE.Mesh) {
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => {
                material.dispose();
            });
        }
        else if (mesh.material) {
            mesh.material.dispose();
        }
    }
}
function createRotationInfos(visible, inverse) {
    infoGroups.forEach((group) => {
        baseGroup.remove(group);
        group.children.forEach((child) => {
            disposeMesh(child);
        });
    });
    infoGroups = [];
    if (visible) {
        const loader = new FontLoader_1.FontLoader();
        loader.load(require('three/examples/fonts/helvetiker_regular.typeface.json').default, function (font) {
            createRotationInfoGroup(font, 'F', inverse, 0, 0, 1, 0, new THREE.Vector3(0, 0, 0));
            createRotationInfoGroup(font, 'B', inverse, 0, 0, -1, 180, new THREE.Vector3(0, 1, 0));
            createRotationInfoGroup(font, 'R', inverse, 1, 0, 0, 90, new THREE.Vector3(0, 1, 0));
            createRotationInfoGroup(font, 'L', inverse, -1, 0, 0, -90, new THREE.Vector3(0, 1, 0));
            createRotationInfoGroup(font, 'U', inverse, 0, 1, 0, -90, new THREE.Vector3(1, 0, 0));
            createRotationInfoGroup(font, 'D', inverse, 0, -1, 0, 90, new THREE.Vector3(1, 0, 0));
        });
    }
}
function getRotationMatrix(axis, degrees) {
    const angle = degrees * Math.PI / 180;
    switch (axis) {
        case "x":
            return new THREE.Matrix4().makeRotationX(angle);
        case "y":
            return new THREE.Matrix4().makeRotationY(angle);
        case "z":
            return new THREE.Matrix4().makeRotationZ(angle);
        default:
            return new THREE.Matrix4();
    }
}
function toggleHideObjects(objects) {
    objects.forEach((object) => {
        object.visible = !object.visible;
    });
}
function getRotationData(key) {
    // Define the rotation operations
    // l: left, m: middle, r: right, u: up, e: equator, d: down, b: back, s: standing, f: front
    // x: x-axis, y: y-axis, z: z-axis
    // The rotation operations are defined by the axis of rotation, the degrees of rotation, the direction of rotation,
    // and the list of piece indices of the slice to rotate. The piece indices are defined in clockwise order when
    // looking at the face of the cube from outside.
    const data = {
        "l": { axis: "x", degrees: 90, forward: true, nums: [0, 9, 18, 21, 24, 15, 6, 3, 12] },
        "m": { axis: "x", degrees: 90, forward: false, nums: [1, 4, 7, 16, 25, 22, 19, 10, 13] },
        "r": { axis: "x", degrees: -90, forward: true, nums: [26, 23, 20, 11, 2, 5, 8, 17, 14] },
        "u": { axis: "y", degrees: -90, forward: false, nums: [6, 7, 8, 17, 26, 25, 24, 15, 16] },
        "e": { axis: "y", degrees: 90, forward: false, nums: [3, 12, 21, 22, 23, 14, 5, 4, 13] },
        "d": { axis: "y", degrees: 90, forward: false, nums: [18, 19, 20, 11, 2, 1, 0, 9, 10] },
        "b": { axis: "z", degrees: 90, forward: true, nums: [0, 3, 6, 7, 8, 5, 2, 1, 4] },
        "s": { axis: "z", degrees: -90, forward: true, nums: [9, 10, 11, 14, 17, 16, 15, 12, 13] },
        "f": { axis: "z", degrees: -90, forward: true, nums: [24, 21, 18, 19, 20, 23, 26, 25, 22] },
        "x": { axis: "x", degrees: -90, forward: true, nums: [] },
        "y": { axis: "y", degrees: -90, forward: true, nums: [] },
        "z": { axis: "z", degrees: -90, forward: true, nums: [] }
    };
    return data[key];
}
function undoOperation() {
    if (numAnims > 0 || opsHistoryIndex < 0 || isHideNext) {
        return; // no undo while an animation is running
    }
    let key = opsHistory[opsHistoryIndex--];
    if (key) {
        const undoKey = (key === key.toLowerCase()) ? key.toUpperCase() : key.toLowerCase();
        rotate(undoKey, false);
    }
}
function redoOperation() {
    if (numAnims > 0 || opsHistoryIndex >= opsHistory.length - 1 || isHideNext) {
        return; // no redo while an animation is running
    }
    let key = opsHistory[++opsHistoryIndex];
    if (key) {
        rotate(key, false);
    }
}
function rotateByEvent(event) {
    rotate(event.key + (event.altKey ? "!" : ""));
}
function rotate(key, addToHistory = true) {
    if (numAnims > 0) {
        return; // no rotation while an animation is running
    }
    const { axis, degrees, forward, nums } = getRotationData(key[0].toLowerCase());
    if (isHideNext) {
        toggleHideObjects(nums.map((index) => rotPieces[index])); // toggle hide state instead
        isHideNext = false;
        return;
    }
    if (addToHistory) {
        if (opsHistory.length > opsHistoryIndex + 1) {
            // cut redo history and add new operation
            opsHistory.splice(opsHistoryIndex + 1, opsHistory.length - opsHistoryIndex + 1, key);
            // console.log("cut redo history and add new operation");
        }
        else {
            opsHistory.push(key);
            // console.log("add new operation");
        }
        opsHistoryIndex++;
    }
    // console.log("key: " + key + " index: " + opsHistoryIndex + " length: " + opsHistory.length);
    const piecesToRotate = rotateModel(key, forward, nums);
    rotateGraphics(piecesToRotate, axis, (key === key.toLowerCase()) ? degrees : -degrees);
    if (isShowNumbers) {
        setAllCubesNumbered();
    }
}
function rotateGraphics(pieces, axis, degrees) {
    // rotate the selected pieces as animation
    pieces.forEach((piece) => {
        const startMatrix = piece.matrix.clone();
        const animObj = { lerpFactor: 0 };
        const tl = gsap_1.default.timeline();
        numAnims++;
        tl.to(animObj, {
            lerpFactor: 1, duration: 0.5, ease: "linear",
            onUpdate: () => {
                piece.matrix.copy(startMatrix); // Reset the matrix to the start matrix (undo previous rotations)
                piece.applyMatrix4(getRotationMatrix(axis, animObj.lerpFactor * degrees));
                piece.matrixWorldNeedsUpdate = true;
            },
            onComplete: () => {
                numAnims--;
                if (numAnims === 0 && opsTodo.length > 0) {
                    const op = opsTodo.pop();
                    if (op !== undefined) {
                        sleep(50).then(() => rotate(op));
                    }
                }
            }
        });
    });
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function rotateModel(key, forward, nums) {
    // rotate the cube model. It must follow the rotation so that slices can properly be selected after each rotation
    let isCtrl = key.endsWith('!');
    key = key[0];
    const keyLc = key === key.toLowerCase();
    let piecesToRotate = []; // the pieces to rotate
    switch (key.toLowerCase()) {
        case "x":
            piecesToRotate = rotPieces; // all pieces
            rotateModelSliceByKey("l", !keyLc);
            rotateModelSliceByKey("m", !keyLc);
            rotateModelSliceByKey("r", keyLc);
            break;
        case "y":
            piecesToRotate = rotPieces; // all pieces
            rotateModelSliceByKey("u", keyLc);
            rotateModelSliceByKey("e", !keyLc);
            rotateModelSliceByKey("d", !keyLc);
            break;
        case "z":
            piecesToRotate = rotPieces; // all pieces
            rotateModelSliceByKey("f", keyLc);
            rotateModelSliceByKey("s", keyLc);
            rotateModelSliceByKey("b", !keyLc);
            break;
        default:
            rotateModelSlice(nums, keyLc === forward);
            if (isCtrl) {
                let nums2 = rotateAdjacentSlice(key, keyLc === forward);
                nums = nums.concat(nums2);
            }
            piecesToRotate = nums.map((index) => rotPieces[index]);
    }
    return piecesToRotate;
}
function rotateAdjacentSlice(key, forward) {
    let nums = [];
    switch (key.toLowerCase()) {
        case "l":
            return rotateModelSliceByKey("m", forward);
        case "r":
            return rotateModelSliceByKey("m", !forward);
        case "f":
            return rotateModelSliceByKey("s", forward);
        case "b":
            return rotateModelSliceByKey("s", !forward);
        case "u":
            return rotateModelSliceByKey("e", forward);
        case "d":
            return rotateModelSliceByKey("e", !forward);
    }
    return nums;
}
function rotateModelSliceByKey(key, keyLc) {
    const { axis, degrees, forward, nums } = getRotationData(key.toLowerCase());
    rotateModelSlice(nums, keyLc === forward);
    return nums;
}
function rotateModelSlice(nums, rightRotate) {
    // reflect the turn in the pieces list
    if (rightRotate) {
        const tempA = rotPieces[nums[0]];
        const tempB = rotPieces[nums[1]];
        for (let i = 0; i <= 5; i++) {
            rotPieces[nums[i]] = rotPieces[nums[i + 2]];
        }
        rotPieces[nums[6]] = tempA;
        rotPieces[nums[7]] = tempB;
    }
    else {
        const tempA = rotPieces[nums[7]];
        const tempB = rotPieces[nums[6]];
        for (let i = 5; i >= 0; i--) {
            rotPieces[nums[i + 2]] = rotPieces[nums[i]];
        }
        rotPieces[nums[1]] = tempA;
        rotPieces[nums[0]] = tempB;
    }
}
function shuffleOperation(n = 20) {
    const moves = is2x2 ? ["l", "r", "u", "d", "b", "f"]
        : ["l", "m", "r", "u", "e", "d", "b", "s", "f"];
    for (let i = 0; i < n; i++) {
        let index = Math.floor(Math.random() * moves.length * 2);
        if (index >= moves.length) {
            index -= moves.length;
            moves[index] = moves[index].toUpperCase();
        }
        opsTodo.push(moves[index]);
    }
    const op = opsTodo.pop();
    if (op !== undefined) {
        rotate(op);
    }
}
function scaleTo2x2(forward, duration = 0.5) {
    if (forward === is2x2) {
        // console.log("already in desired 2x2 mode: "+forward);
        return new Promise((resolve, reject) => { resolve(); });
    }
    return new Promise((resolve) => {
        const centerIndexes = [1, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 21, 22, 23, 25]; // the center pieces, all except the corners
        const centerPieces = centerIndexes.map((index) => fixedPieces[index]);
        const centerStartMatrices = centerPieces.map((piece) => piece.matrix.clone());
        const cornerIndexes = [0, 2, 6, 8, 18, 20, 24, 26]; // the corner pieces
        const cornerPieces = cornerIndexes.map((index) => fixedPieces[index]);
        const cornerStartMatrices = cornerPieces.map((piece) => piece.matrix.clone());
        if (!forward) {
            centerPieces.forEach((piece) => { piece.visible = true; });
        }
        const lerpCenterScale = forward ? 0.8 : 1 / 0.8;
        const lerpCornerScale = forward ? 1.5 : 1 / 1.5;
        const lerpCornerTranslation = forward ? -0.5 : 0.75;
        const animObj = { lerpCenterScale: 1, lerpCornerScale: 1, lerpCornerTranslation: 0 };
        const tl = gsap_1.default.timeline();
        numAnims++;
        tl.to(animObj, {
            lerpCenterScale: lerpCenterScale, lerpCornerScale: lerpCornerScale, lerpCornerTranslation: lerpCornerTranslation, duration: duration, ease: "linear",
            onUpdate: () => {
                // Scale the center pieces
                centerPieces.forEach((piece, index) => {
                    piece.matrix.copy(centerStartMatrices[index]); // Reset the matrix to the start matrix (undo previous scale)
                    piece.applyMatrix4(new THREE.Matrix4().makeScale(animObj.lerpCenterScale, animObj.lerpCenterScale, animObj.lerpCenterScale));
                    piece.matrixWorldNeedsUpdate = true;
                });
                // Scale and move the corner pieces
                cornerPieces.forEach((piece, index) => {
                    piece.matrix.copy(cornerStartMatrices[index]); // Reset the matrix to the start matrix (undo previous transforms)
                    const translationVector = piece.position.clone().normalize().multiplyScalar(animObj.lerpCornerTranslation * Math.sqrt(3));
                    piece.applyMatrix4(new THREE.Matrix4().makeScale(animObj.lerpCornerScale, animObj.lerpCornerScale, animObj.lerpCornerScale)
                        .multiply(new THREE.Matrix4().makeTranslation(translationVector.x, translationVector.y, translationVector.z)));
                    piece.matrixWorldNeedsUpdate = true;
                });
            },
            onComplete: () => {
                numAnims--;
                if (forward) {
                    centerPieces.forEach((piece) => { piece.visible = false; });
                }
                is2x2 = forward;
                resolve();
            }
        });
    });
}
function getScaleAndTrans(addl, forward, transFactor) {
    const scale2 = 1 + addl;
    return [forward ? scale2 : 1 / scale2, (forward ? (1 - scale2) / 2 : (1 - 1 / scale2) / 2) * transFactor];
}
function scaleToMirrorCube(forward, duration = 0.5) {
    if (forward === isMirrorCube) {
        // console.log("already in desired mirror cube mode: "+forward);
        return new Promise((resolve, reject) => { resolve(); });
    }
    return new Promise((resolve) => {
        const leftIndexes = []; // the left pieces
        const rightIndexes = []; // the right pieces
        const bottomIndexes = []; // the bottom pieces
        const topIndexes = []; // the top pieces
        const backIndexes = []; // the back pieces
        const frontIndexes = []; // the front pieces
        for (let i = 0; i < 27; i++) {
            const ix = i % 3;
            const iy = Math.floor(i / 3) % 3;
            const iz = Math.floor(i / 9);
            if (ix === 0) {
                leftIndexes.push(i);
            }
            if (ix === 2) {
                rightIndexes.push(i);
            }
            if (iy === 0) {
                bottomIndexes.push(i);
            }
            if (iy === 2) {
                topIndexes.push(i);
            }
            if (iz === 0) {
                backIndexes.push(i);
            }
            if (iz === 2) {
                frontIndexes.push(i);
            }
        }
        const [leftScaleTo, leftTransTo] = getScaleAndTrans(0.4, forward, 1);
        const [rightScaleTo, rightTransTo] = getScaleAndTrans(-0.4, forward, -1);
        const [bottomScaleTo, bottomTransTo] = getScaleAndTrans(-0.6, forward, 1);
        const [topScaleTo, topTransTo] = getScaleAndTrans(0.6, forward, -1);
        const [backScaleTo, backTransTo] = getScaleAndTrans(0.2, forward, 1);
        const [frontScaleTo, frontTransTo] = getScaleAndTrans(-0.2, forward, -1);
        const startMatrices = fixedPieces.map((piece) => getBox(piece).matrix.clone());
        const animObj = { leftScale: 1, leftTrans: 0, rightScale: 1, rightTrans: 0, bottomScale: 1, bottomTrans: 0, topScale: 1, topTrans: 0,
            backScale: 1, backTrans: 0, frontScale: 1, frontTrans: 0 };
        const tl = gsap_1.default.timeline();
        numAnims++;
        tl.to(animObj, {
            leftScale: leftScaleTo, leftTrans: leftTransTo, rightScale: rightScaleTo, rightTrans: rightTransTo,
            bottomScale: bottomScaleTo, bottomTrans: bottomTransTo, topScale: topScaleTo, topTrans: topTransTo,
            backScale: backScaleTo, backTrans: backTransTo, frontScale: frontScaleTo, frontTrans: frontTransTo,
            duration: duration, ease: "linear",
            onUpdate: () => {
                fixedPieces.forEach((piece, index) => {
                    getBox(piece).matrix.copy(startMatrices[index]); // Reset the matrix to the start matrix (undo previous transforms)
                });
                // Scale and move the left pieces
                leftIndexes.forEach((index) => {
                    const box = getBox(fixedPieces[index]);
                    box.applyMatrix4(new THREE.Matrix4().makeTranslation(animObj.leftTrans, 0, 0)
                        .multiply(new THREE.Matrix4().makeScale(animObj.leftScale, 1, 1)));
                    box.matrixWorldNeedsUpdate = true;
                });
                // Scale and move the right pieces
                rightIndexes.forEach((index) => {
                    const box = getBox(fixedPieces[index]);
                    box.applyMatrix4(new THREE.Matrix4().makeTranslation(animObj.rightTrans, 0, 0)
                        .multiply(new THREE.Matrix4().makeScale(animObj.rightScale, 1, 1)));
                    box.matrixWorldNeedsUpdate = true;
                });
                // Scale and move the bottom pieces
                bottomIndexes.forEach((index) => {
                    const box = getBox(fixedPieces[index]);
                    box.applyMatrix4(new THREE.Matrix4().makeTranslation(0, animObj.bottomTrans, 0)
                        .multiply(new THREE.Matrix4().makeScale(1, animObj.bottomScale, 1)));
                    box.matrixWorldNeedsUpdate = true;
                });
                // Scale and move the top pieces
                topIndexes.forEach((index) => {
                    const box = getBox(fixedPieces[index]);
                    box.applyMatrix4(new THREE.Matrix4().makeTranslation(0, animObj.topTrans, 0)
                        .multiply(new THREE.Matrix4().makeScale(1, animObj.topScale, 1)));
                    box.matrixWorldNeedsUpdate = true;
                });
                // Scale and move the back pieces
                backIndexes.forEach((index) => {
                    const box = getBox(fixedPieces[index]);
                    box.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, animObj.backTrans)
                        .multiply(new THREE.Matrix4().makeScale(1, 1, animObj.backScale)));
                    box.matrixWorldNeedsUpdate = true;
                });
                // Scale and move the front pieces
                frontIndexes.forEach((index) => {
                    const box = getBox(fixedPieces[index]);
                    box.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, animObj.frontTrans)
                        .multiply(new THREE.Matrix4().makeScale(1, 1, animObj.frontScale)));
                    box.matrixWorldNeedsUpdate = true;
                });
            },
            onComplete: () => {
                numAnims--;
                isMirrorCube = forward;
                resolve();
            }
        });
    });
}
function createNormals(mesh) {
    const group = new THREE.Group();
    group.name = "normals";
    if (isPyraShape) {
        if (typeof mesh.geometry.morphAttributes.position !== "undefined") {
            const pos2 = mesh.geometry.morphAttributes.position[0];
            const norm2 = mesh.geometry.morphAttributes.normal[0];
            for (let i = 0; i < pos2.count; i++) {
                const p2 = new THREE.Vector3().fromBufferAttribute(pos2, i);
                const n2 = new THREE.Vector3().fromBufferAttribute(norm2, i);
                const arrow2 = new THREE.ArrowHelper(n2, p2, 0.5, 0x00ff00);
                group.add(arrow2);
            }
        }
    }
    else {
        const pos1 = mesh.geometry.attributes.position;
        const norm1 = mesh.geometry.attributes.normal;
        for (let i = 0; i < pos1.count; i++) {
            const p1 = new THREE.Vector3().fromBufferAttribute(pos1, i);
            const n1 = new THREE.Vector3().fromBufferAttribute(norm1, i);
            const arrow = new THREE.ArrowHelper(n1, p1, 0.25, 0xff0000);
            group.add(arrow);
        }
    }
    return group;
}
function morphToPyra(forward, duration = 0.5) {
    if (forward === isPyraShape) {
        // console.log("already in desired pyramorphix mode: "+forward);
        return new Promise((resolve, reject) => { resolve(); });
    }
    return new Promise((resolve) => {
        const animObj = { lerpFactor: forward ? 0.0 : 1.0 };
        const tl = gsap_1.default.timeline();
        tl.to(animObj, {
            lerpFactor: forward ? 1.0 : 0.0, duration: duration, ease: "linear",
            onUpdate: () => {
                fixedPieces.forEach((piece) => {
                    const box = getBox(piece);
                    if (typeof box.morphTargetInfluences !== 'undefined') {
                        box.morphTargetInfluences[0] = animObj.lerpFactor;
                    }
                });
            },
            onComplete: () => {
                isPyraShape = forward;
                resolve();
            }
        });
    });
}
function doInSequence(ops) {
    return new Promise((resolve) => {
        let i = 0;
        const doNext = () => {
            if (i < ops.length) {
                ops[i]().then(() => sleep(500)).then(() => {
                    i++;
                    doNext();
                });
            }
            else {
                resolve();
            }
        };
        doNext();
    });
}
// a function that wraps another function and returns a promise
// that resolves after the wrapped function has been called
function wrapInPromise(func) {
    return new Promise((resolve) => {
        func();
        resolve();
    });
}
// switch between 0=3x3, 1=2x2, 3=pyramorphix, 2=odd pyramorphix with 2x2 centers
function morphCombined(newState) {
    const paths = [
        { from: 0, to: 1, ops: [() => scaleTo2x2(true)] },
        { from: 1, to: 0, ops: [() => scaleTo2x2(false)] },
        { from: 1, to: 3, ops: [() => morphToPyra(true), () => wrapInPromise(() => setAllPyraColors())] },
        { from: 3, to: 1, ops: [() => morphToPyra(false), () => wrapInPromise(() => setAllCubeColors())] },
        { from: 3, to: 2, ops: [() => scaleTo2x2(false)] },
        { from: 2, to: 3, ops: [() => scaleTo2x2(true)] },
        { from: 0, to: 3, ops: [() => scaleTo2x2(true), () => morphToPyra(true), () => wrapInPromise(() => setAllPyraColors())] }, // 0-1, 1-2
        { from: 3, to: 0, ops: [() => morphToPyra(false), () => wrapInPromise(() => setAllCubeColors()), () => scaleTo2x2(false)] }, // 2-1, 1-0
        { from: 0, to: 2, ops: [() => morphToPyra(true), () => wrapInPromise(() => setAllPyraColors())] },
        { from: 2, to: 0, ops: [() => morphToPyra(false), () => wrapInPromise(() => setAllCubeColors())] }
    ];
    return new Promise((resolve) => {
        const ops = [];
        const orgState = (is2x2 ? 1 : 0) + (isPyraShape ? 2 : 0);
        // console.log("morphing from " + orgState + " to " + newState);
        const path = paths.find((path) => path.from === orgState && path.to === newState);
        path === null || path === void 0 ? void 0 : path.ops.forEach((op) => ops.push(op));
        doInSequence(ops)
            .then(() => {
            const state = (is2x2 ? 1 : 0) + (isPyraShape ? 2 : 0);
            // console.log("Arrived at state "+state);
        })
            .then(() => resolve());
    });
}
var ColorMask;
(function (ColorMask) {
    ColorMask[ColorMask["All"] = 0] = "All";
    ColorMask[ColorMask["Centers"] = 1] = "Centers";
    ColorMask[ColorMask["TopEdges"] = 2] = "TopEdges";
    ColorMask[ColorMask["TopLayer"] = 3] = "TopLayer";
    ColorMask[ColorMask["BottomEdges"] = 4] = "BottomEdges";
    ColorMask[ColorMask["FirstTwoLayers"] = 5] = "FirstTwoLayers";
    ColorMask[ColorMask["TopCrossFaces"] = 6] = "TopCrossFaces";
    ColorMask[ColorMask["TopBarFaces"] = 7] = "TopBarFaces";
    ColorMask[ColorMask["TopEllFaces"] = 8] = "TopEllFaces";
    ColorMask[ColorMask["TopThreeEdges"] = 9] = "TopThreeEdges";
    ColorMask[ColorMask["TopThreeCornersLeft"] = 10] = "TopThreeCornersLeft";
    ColorMask[ColorMask["TopThreeCornersRight"] = 11] = "TopThreeCornersRight";
})(ColorMask || (ColorMask = {}));
let colorMaskOption = ColorMask.All;
function getMaskEnabled() {
    function getCenters() {
        return { 4: { all: true }, 10: { all: true }, 12: { all: true }, 14: { all: true }, 16: { all: true }, 22: { all: true } };
    }
    function getLayers(ylayerFrom, yLayerTo) {
        const res = {};
        for (let z = -1; z <= 1; z++) {
            for (let y = ylayerFrom; y <= yLayerTo; y++) {
                for (let x = -1; x <= 1; x++) {
                    let index = (x + 1) + (y + 1) * 3 + (z + 1) * 9;
                    res[index] = { all: true };
                }
            }
        }
        return res;
    }
    function firstTwoLayers() {
        return Object.assign(getCenters(), getLayers(-1, 0));
    }
    switch (colorMaskOption) {
        case ColorMask.All: return { 999: { all: true } };
        case ColorMask.Centers: return getCenters();
        case ColorMask.TopEdges:
            const corners = { 7: { all: true }, 15: { all: true }, 17: { all: true }, 25: { all: true } };
            return Object.assign(getCenters(), corners);
        case ColorMask.TopLayer: return Object.assign(getCenters(), getLayers(1, 1));
        case ColorMask.BottomEdges:
            const corners2 = { 1: { all: true }, 9: { all: true }, 11: { all: true }, 19: { all: true } };
            return Object.assign(getCenters(), corners2);
        case ColorMask.FirstTwoLayers: return firstTwoLayers();
        case ColorMask.TopCrossFaces:
            const topCross = { 7: { faces: [3] }, 15: { faces: [3] }, 17: { faces: [3] }, 25: { faces: [3] } };
            return Object.assign(firstTwoLayers(), topCross);
        case ColorMask.TopBarFaces:
            const topBar = { 15: { faces: [3] }, 17: { faces: [3] } };
            return Object.assign(firstTwoLayers(), topBar);
        case ColorMask.TopEllFaces:
            const topEll = { 15: { faces: [3] }, 7: { faces: [3] } };
            return Object.assign(firstTwoLayers(), topEll);
        case ColorMask.TopThreeEdges:
            const top3 = { 15: { all: true }, 17: { all: true }, 25: { all: true } };
            return Object.assign(firstTwoLayers(), top3);
        case ColorMask.TopThreeCornersLeft:
            const top3cl = { 6: { all: true }, 24: { all: true }, 26: { all: true } };
            return Object.assign(firstTwoLayers(), top3cl);
        case ColorMask.TopThreeCornersRight:
            const top3cr = { 24: { all: true }, 26: { all: true }, 8: { all: true } };
            return Object.assign(firstTwoLayers(), top3cr);
        default:
            return {};
    }
}
function rotateByButton(key) {
    if (shiftKeyDown) {
        key = key.toUpperCase();
    }
    rotate(key);
}
function resetView() {
    isViewRight = true;
    viewUp = 1;
    tumble = false;
    setViewRotation(baseGroup);
    controls.reset();
}
function setViewRotation(group) {
    const angles = [{ x: -40, y: 30 }, { x: -40, y: -30 }, { x: 30, y: 30 }, { x: 30, y: -30 },
        { x: 130, y: 30 }, { x: 130, y: -30 }];
    let pos = (isViewRight ? 1 : 0) + 2 * viewUp;
    // console.log("pos: "+ pos);
    group.rotation.set(Math.PI / 180 * angles[pos].x, Math.PI / 180 * angles[pos].y, 0);
    group.updateMatrix();
}
function setBasegroupRotation() {
    const startQuaternion = baseGroup.quaternion.clone();
    const targetState = new THREE.Group();
    setViewRotation(targetState);
    targetState.updateMatrix();
    const targetQuaternion = targetState.quaternion.clone();
    const animObj = { lerpFactor: 0 };
    const tl = gsap_1.default.timeline();
    numAnims++;
    tl.to(animObj, {
        lerpFactor: 1, duration: 0.5, ease: "linear",
        onUpdate: () => {
            // console.log("lerpFactor: " + animObj.lerpFactor);
            baseGroup.quaternion.slerp(targetQuaternion, animObj.lerpFactor);
            baseGroup.updateMatrix();
        },
        onComplete: () => {
            numAnims--;
        }
    });
}
function toggleViewBack() {
    viewUp = viewUp === 1 ? 2 : 1;
    setBasegroupRotation();
}
function toggleViewUnder() {
    viewUp = viewUp === 1 ? 0 : 1;
    setBasegroupRotation();
}
function toggleViewRight() {
    isViewRight = !isViewRight;
    setBasegroupRotation();
}
function toggleTumble() {
    tumble = !tumble;
}
function toggleNormals() {
    if (isNormals) {
        removeNormals();
    }
    else {
        addNormals();
    }
    isNormals = !isNormals;
}
function toggleMirrorCube() {
    scaleToMirrorCube(!isMirrorCube).then(() => { isMirrorColors = isMirrorCube; setAllCubeFaces(); });
}
function toggleGold() {
    isGold = !isGold;
    if (isGold) {
        mirrorMaterials = [goldMaterial, goldMaterial, goldMaterial, goldMaterial, goldMaterial, goldMaterial];
    }
    else {
        mirrorMaterials = [silverMaterial, silverMaterial, silverMaterial, silverMaterial, silverMaterial, silverMaterial];
    }
    setAllCubeFaces();
}
function setupGui() {
    const gui = new dat_gui_1.GUI({ closed: false, width: 100, autoPlace: false });
    gui.close();
    // gui.add( document, 'title' ).name('');
    gui.add({ fun: () => toggleRotationInfos() }, 'fun').name('Help [F1]');
    const shapeFolder = gui.addFolder('Shape');
    shapeFolder.add({ fun: () => morphCombined(0) }, 'fun').name('3x3 [F2]');
    shapeFolder.add({ fun: () => morphCombined(1) }, 'fun').name('2x2 [F3]');
    shapeFolder.add({ fun: () => morphCombined(3) }, 'fun').name('Pyramorphix [F4]');
    shapeFolder.add({ fun: () => morphCombined(2) }, 'fun').name('Poke-like [F5]');
    shapeFolder.add({ fun: () => toggleMirrorCube() }, 'fun').name('Mirror [F8]');
    const looksFolder = gui.addFolder('View');
    looksFolder.add({ fun: () => toggleViewRight() }, 'fun').name('Left/Right [1]');
    looksFolder.add({ fun: () => toggleViewBack() }, 'fun').name('Backside [2]');
    looksFolder.add({ fun: () => toggleViewUnder() }, 'fun').name('Underside [3]');
    looksFolder.add({ fun: () => resetView() }, 'fun').name('Reset [0]');
    looksFolder.add({ fun: () => toggleTumble() }, 'fun').name('Tumble [t]');
    looksFolder.add({ fun: () => toggleWireframe() }, 'fun').name('Wireframe [w]');
    looksFolder.add({ fun: () => setAllPyraColors() }, 'fun').name('Pyra-Colors [F6]');
    looksFolder.add({ fun: () => setAllCubeColors() }, 'fun').name('Cube-Colors [F7]');
    looksFolder.add({ fun: () => toggleGold() }, 'fun').name('Gold mirror [g]');
    const rotFolder = gui.addFolder('Rotations');
    rotFolder.add({ fun: () => undoOperation() }, 'fun').name('Undo [^z,9]');
    rotFolder.add({ fun: () => shuffleOperation() }, 'fun').name('Shuffle [F9]');
    rotFolder.add({ fun: () => resetMain() }, 'fun').name('Reset [F10]');
    rotFolder.add({ fun: () => rotateByButton('l') }, 'fun').name('Left [l]');
    rotFolder.add({ fun: () => rotateByButton('m') }, 'fun').name('Middle [m]');
    rotFolder.add({ fun: () => rotateByButton('r') }, 'fun').name('Right [r]');
    rotFolder.add({ fun: () => rotateByButton('u') }, 'fun').name('Up [u]');
    rotFolder.add({ fun: () => rotateByButton('e') }, 'fun').name('Equator [e]');
    rotFolder.add({ fun: () => rotateByButton('d') }, 'fun').name('Down [d]');
    rotFolder.add({ fun: () => rotateByButton('f') }, 'fun').name('Front [f]');
    rotFolder.add({ fun: () => rotateByButton('s') }, 'fun').name('Standing [s]');
    rotFolder.add({ fun: () => rotateByButton('b') }, 'fun').name('Back [b]');
    rotFolder.add({ fun: () => rotateByButton('x') }, 'fun').name('X-axis [x]');
    rotFolder.add({ fun: () => rotateByButton('y') }, 'fun').name('Y-axis [y]');
    rotFolder.add({ fun: () => rotateByButton('z') }, 'fun').name('Z-axis [z]');
    const dbgFolder = gui.addFolder('Debug');
    dbgFolder.add({ fun: () => toggleAxes() }, 'fun').name('Axes [a]');
    dbgFolder.add({ fun: () => toggleNumbers() }, 'fun').name('Numbers [n]');
    dbgFolder.add({ fun: () => toggleNormals() }, 'fun').name('Normals [4]');
    return gui;
}
function onKeyDown(event) {
    let isMac = /Mac/i.test(navigator.userAgent);
    let decodedKey = null;
    switch (event.key) {
        case "F1":
            toggleRotationInfos();
            break;
        case "F2":
            morphCombined(0);
            break;
        case "F3":
            morphCombined(1);
            break;
        case "F4":
            morphCombined(3);
            break;
        case "F5":
            morphCombined(2);
            break;
        case "F6":
            isPyraColors = true;
            setAllCubeFaces();
            break;
        case "F7":
            isPyraColors = false;
            setAllCubeFaces();
            break;
        case "F8":
            toggleMirrorCube();
            break;
        case "F9":
            shuffleOperation();
            break;
        case "F10":
            resetMain();
            break;
        case "F12":
            window.ipcRenderer.send('open-dev-tools');
            break;
        case "0":
            resetView();
            break;
        case "1":
            toggleViewRight();
            break;
        case "2":
            toggleViewBack();
            break;
        case "3":
            toggleViewUnder();
            break;
        case "4":
            toggleNormals();
            break;
        case "5":
            toggleShowOneCube();
            break;
        case "6":
            showAll(true);
            break;
        case "8":
            redoOperation();
            break;
        case "9":
            undoOperation();
            break;
        case "q":
            window.ipcRenderer.send('app-quit');
            break;
        case "a":
            toggleAxes();
            break;
        case "g":
        case "G":
            toggleGold();
            setAllCubeFaces();
            break;
        case "n":
        case "N":
            toggleNumbers();
            break;
        case "i":
        case "I":
            isHideNext = true;
            break;
        case "w":
        case "W":
            toggleWireframe();
            break;
        case "l": // left
        case "L":
        case "m": // middle
        case "M":
        case "r": // right
        case "R":
        case "u": // up
        case "U":
        case "e": // equator
        case "E":
        case "d": // down
        case "D":
        case "b": // back
        case "B":
        case "s": // standing
        case "S":
        case "f": // front
        case "F":
        case "x": // x-axis
        case "X":
        case "y": // y-axis
        case "Y":
            if ((isMac && event.metaKey || !isMac && event.ctrlKey)) {
                redoOperation();
            }
            else {
                rotateByEvent(event);
            }
            break;
        case "z": // z-axis
        case "Z":
            if ((isMac && event.metaKey || !isMac && event.ctrlKey)) {
                undoOperation();
            }
            else {
                rotateByEvent(event);
            }
            break;
        case "t": // Pause animation
        case "T":
            toggleTumble();
            break;
        case "ArrowUp":
            // cube.rotation.x += 0.1;
            // cube.updateMatrix();
            {
                let numOptions = Object.keys(ColorMask).length;
                testIndex = Math.min(testIndex + 1, numOptions - 1);
                colorMaskOption = testIndex;
                // console.log("colorMaskOption: " + colorMaskOption);
                setAllCubeColors();
            }
            break;
        case "ArrowDown":
            // cube.rotation.x -= 0.1;
            // cube.updateMatrix();
            {
                let numOptions = Object.keys(ColorMask).length;
                testIndex = Math.max(testIndex - 1, 0);
                colorMaskOption = testIndex;
                // console.log("colorMaskOption: " + colorMaskOption);
                setAllCubeColors();
            }
            break;
        case "ArrowLeft":
            // baseGroup.rotation.y += 0.1;
            // baseGroup.updateMatrix();
            testIndex = Math.max(testIndex - 1, 0);
            isShowOneCube = false;
            toggleShowOneCube();
            break;
        case "ArrowRight":
            // baseGroup.rotation.y -= 0.1;
            // baseGroup.updateMatrix();
            testIndex = Math.min(testIndex + 1, 26);
            isShowOneCube = false;
            toggleShowOneCube();
            break;
        case "k":
            baseGroup.rotation.z += 0.1;
            baseGroup.updateMatrix();
            break;
        case "K":
            baseGroup.rotation.z -= 0.1;
            baseGroup.updateMatrix();
            break;
        default:
            if (event.altKey) {
                switch (event.code) {
                    case "KeyL":
                        decodedKey = "l";
                        break;
                    case "KeyR":
                        decodedKey = "r";
                        break;
                    case "KeyU":
                        decodedKey = "u";
                        break;
                    case "KeyD":
                        decodedKey = "d";
                        break;
                    case "KeyF":
                        decodedKey = "f";
                        break;
                    case "KeyB":
                        decodedKey = "b";
                        break;
                }
                if (decodedKey != null) {
                    if (event.shiftKey) {
                        decodedKey = decodedKey.toUpperCase();
                    }
                    rotate(decodedKey + "!"); // rotate with alt key
                }
            }
    }
    event.preventDefault();
}
document.addEventListener("keydown", onKeyDown);
let shiftKeyDown = false;
document.addEventListener('keydown', function (event) {
    if (event.shiftKey && !shiftKeyDown) {
        shiftKeyDown = true;
        if (showRotationInfos) {
            createRotationInfos(true, true);
        }
    }
});
document.addEventListener('keyup', function (event) {
    if (event.key === 'Shift') {
        shiftKeyDown = false;
        if (showRotationInfos) {
            createRotationInfos(true, false);
        }
    }
});
window.addEventListener("DOMContentLoaded", init);
// Function to calculate the distance required to fit the object
function calculateDistanceToFitObject(camera, objectWidth, objectHeight) {
    const aspect = cubeDiv.clientWidth / cubeDiv.clientHeight;
    const fov = camera.fov * (Math.PI / 180); // Convert vertical FOV to radians
    const height = objectHeight / 2;
    const width = objectWidth / 2;
    // Calculate distance required to fit the object height-wise
    const distanceHeight = height / Math.tan(fov / 2);
    // Calculate distance required to fit the object width-wise based on aspect ratio
    const distanceWidth = width / (Math.tan(fov / 2) * aspect);
    // The camera should be at the maximum of these distances to fit both width and height
    return Math.max(distanceHeight, distanceWidth);
}
// Function to update the camera's position based on the object size and window dimensions
function updateCamera(camera, objectWidth, objectHeight) {
    const aspect = cubeDiv.clientWidth / cubeDiv.clientHeight;
    const newDistance = calculateDistanceToFitObject(camera, objectWidth, objectHeight);
    camera.aspect = aspect;
    camera.position.z = newDistance;
    camera.updateProjectionMatrix();
}
// Resize event handler
window.addEventListener('resize', () => {
    if (cubeDiv === null) {
        return;
    }
    updateCamera(camera, objectWidth, objectHeight);
    renderer.setSize(cubeDiv.clientWidth, cubeDiv.clientHeight);
    controls.handleResize();
});
const cubeObject = {
    undo: () => { undoOperation(); },
    redo: () => { redoOperation(); },
    shuffle: (n) => { shuffleOperation(n); },
    morph: (n) => { morphCombined(n); },
    help: () => { toggleRotationInfos(); },
};
// Expose the cube object to the global scope
window.cube = cubeObject;
//# sourceMappingURL=renderer.js.map