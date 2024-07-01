"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomControls = void 0;
const THREE = require("three");
class CustomControls {
    constructor(baseGroup, domElement, document) {
        this.baseGroup = baseGroup;
        this.domElement = domElement;
        this.document = document;
        this.isDragging = false;
        this.initialMousePosition = { x: 0, y: 0 };
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.document.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
    onMouseDown(event) {
        this.isDragging = true;
        this.initialMousePosition = {
            x: event.clientX,
            y: event.clientY,
        };
    }
    onMouseMove(event) {
        if (!this.isDragging) {
            return;
        }
        const deltaMove = {
            x: event.clientX - this.initialMousePosition.x,
            y: event.clientY - this.initialMousePosition.y,
        };
        // Calculate rotation angles based on initial mouse position (double the speed)
        const theta = Math.PI * deltaMove.x / this.domElement.clientWidth;
        const phi = Math.PI * deltaMove.y / this.domElement.clientHeight;
        // Apply rotation to baseGroup
        this.baseGroup.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), theta * 2);
        this.baseGroup.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), phi * 2);
        this.initialMousePosition = {
            x: event.clientX,
            y: event.clientY,
        };
    }
    onMouseUp() {
        this.isDragging = false;
    }
    update() {
        // Any additional updates can be added here
    }
}
exports.CustomControls = CustomControls;
//# sourceMappingURL=CustomControls.js.map