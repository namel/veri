/* global  */
"use strict";

const ee = require('event-emitter');
const THREE = require('three');
const WEBVR = require('./lib/WebVR');
const Stats = require('./lib/stats.min');
require('./lib/VRControls');
require('./lib/ViveController');
require('./lib/OBJLoader');
require('./lib/VREffect');
const DeviceOrientationController = require('./lib/DeviceOrientationController');
const Audio = require('./audio');
const Crosshairs = require('./crosshairs');

class Veri {

    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = null;
        this.crosshairs = null;
        this.mouse = null;
        this.objects = {};
        this.clickableObjects = [];
        this.sphere = {
            radius: 500
        };
        this.videoElement = null;
        this.videoPlaying = false;
        this.ee = this.eventEmitter = ee();

        // declare default UV-mapping
        this.UVMapFactors = {
            "top-to-bottom": {
                right: { yMult: 0.5, yPhase: 0, xMult: 1.0, xPhase: 0 },
                left: { yMult: 0.5, yPhase: 0, xMult: 1.0, xPhase: 0 }
            },
            "left-to-right": {
                right: { yMult: 1.0, yPhase: 0, xMult: 0.5, xPhase: 0 },
                left: { yMult: 1.0, yPhase: 0, xMult: 0.5, xPhase: 0 }
            }
        };
    }

    // convenience function to show a vector
    static showVec(v) {
        return `[${v.x}, ${v.y}, ${v.z}]`;
    }

    // convenience function to return an instance of a 3-vector
    static vec3(x, y, z) {
        return new THREE.Vector3(x, y, z);
    }

    // convenience function to return an instance of an Euler rotation
    static rot3(theta, phi) {
        var thetaRad = theta / 180 * Math.PI;
        var phiRad = phi / 180 * Math.PI;
        return new THREE.Euler(thetaRad + Math.PI / 2, phiRad, 0, 'YXZ');
    }

    // do next animation frame
    doAnimationFrame() {
        this.effect.requestAnimationFrame(this.doAnimationFrame.bind(this));
        if (this.videoPlaying) {
            this.draw(this.renderer.domElement, this.renderer.context, this.videoElement);
            if (typeof this.vrParams.onDraw === 'function') {
                this.vrParams.onDraw();
            }
        }
    }

    // the draw functionality to render each frame
    draw(canvasElement, canvasContext, videoElement) {

        // show current angle for debugging purposes
        let cameraDirection = this.camera.getWorldDirection();
        if (this.vrParams.debug) {
            this.debugCounter++;
            if (this.debugCounter % 90 === 0)
                console.log(`angle is ${Veri.showVec(cameraDirection)}`);
        }

        // update the position of the camera
        this.controls.update();
        this.stats.update();
        if (!this.originalCameraDirection) {
            this.originalCameraDirection = cameraDirection.clone();
            console.log(`setting original camera direction to ${Veri.showVec(cameraDirection)}`);
        }

        // check element resize
        if (canvasElement.width !== this.vrParams.renderer.width ||
            canvasElement.height !== this.vrParams.renderer.height) {

            this.vrParams.renderer.width = canvasElement.width;
            this.vrParams.renderer.height = canvasElement.height;
            this.camera.aspect = canvasElement.width / canvasElement.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(canvasElement.width, canvasElement.height);
        }

        // derive button position relative to camera direction
        let buttonPosition = cameraDirection.clone();
        buttonPosition.multiplyScalar(10);
        let tangent = buttonPosition.clone();
        tangent.cross(this.camera.up);
        tangent.normalize();

        // update the objects position
        for (let o in this.objects) {
            if (this.objects.hasOwnProperty(o)) {

                let vrObj = this.objects[o];
                let userObjectDesc = this.vrParams.objects[o];

                // sanity check that the object has a descriptor
                if (!userObjectDesc) {
                    console.log('ERROR: object with no descriptor.');
                }

                // if this object moves with the camera, update its position
                if (userObjectDesc.movesWithCamera) {

                    // optionally add flapping to button to make it stand out
                    let XRotation = 0;
                    let ZRotation = 0;

                    if (userObjectDesc.flappingAmplitude) {
                        XRotation = userObjectDesc.flappingAmplitude * Math.sin(this.theta);
                    }

                    // TODO: for objects that move with the camera,
                    //       the positions should be relative to the
                    //       current frame of the camera.
                    //       the code below just adds a tangent.
                    //       A simple implementation would be to
                    //       just take the X and multiply by the
                    //       tangent.
                    // button position and rotation
                    let newPos = buttonPosition.clone();
                    vrObj.position.copy(newPos.add(tangent));
                    vrObj.rotation.set(XRotation, this.phase - this.theta, ZRotation, 'YXZ');
                }
            }
        }

        // copy the sphere texture from the video
        if (this.sphere && this.sphere.texture) {
            // in some cases it is necessary to set the texture image explicitly
            // this.sphere.texture.image = videoElement;
            this.sphere.texture.needsUpdate = true;
        }

        // render
        if (this.vrParams.vrEnabled) {
            this.effect.render(this.scene, this.camera);
        } else {
            this.renderer.clear();
            this.renderer.render(this.scene, this.camera);
        }

        // update the audio positioning
        this.audio && this.audio.changeOrientation(cameraDirection);

        // check crosshairs selection
        if (this.crosshairs) {
            this.crosshairs.update(cameraDirection);
        }
    }

    // add an OBJ resource
    addOBJfunction(resourcePath, resourceName, pos, material) {
        let that = this;
        (new THREE.OBJLoader()).load(resourcePath,
            function(object) {
                that.objects[resourceName] = object;
                object.position.copy(pos);
                object.traverse(function(child) {
                    if (child instanceof THREE.Mesh) {
                        child.material = material;
                        that.clickableObjects.push(child);
                    }
                });
                console.log(`adding object `, object);
                that.scene.add(object);
            }
        );
    }

    // handle window resize
    onWindowResize() {
        console.log('window resize');
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.effect.setSize(window.innerWidth, window.innerHeight);
    }

    resetUVMapping(eye, geometry) {
        geometry.uvsNeedUpdate = true;
        let uvs = geometry.faceVertexUvs[0];
        let factors = this.UVMapFactors[this.vrParams.stereoscopic][eye];
        for (let i = 0; i < uvs.length; i++) {
            for (let j = 0; j < 3; j++) {
                uvs[i][j].x -= factors.xPhase;
                uvs[i][j].x /= factors.xMult;
                uvs[i][j].y -= factors.yPhase;
                uvs[i][j].y /= factors.yMult;
            }
        }
    }

    setUVMapping(eye, geometry) {
        geometry.uvsNeedUpdate = true;
        let uvs = geometry.faceVertexUvs[0];
        let factors = this.UVMapFactors[this.vrParams.stereoscopic][eye];
        for (let i = 0; i < uvs.length; i++) {
            for (let j = 0; j < 3; j++) {
                uvs[i][j].x *= factors.xMult;
                uvs[i][j].x += factors.xPhase;
                uvs[i][j].y *= factors.yMult;
                uvs[i][j].y += factors.yPhase;
            }
        }
    }

    // primary setup function
    setup(vrParams) {
        let that = this;
        window.VR = this;

        // debugging
        if (vrParams.debug)
            this.debugCounter = 0;

        // use polyfill
        if (vrParams.polyfillWebVR) {
            require('webvr-polyfill');
        }

        // Interface tools
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // collect the video element
        let videoElements = document.getElementsByTagName('video');
        if (!videoElements ||
            !(videoElements instanceof HTMLCollection) ||
            videoElements.length !== 1) {
            let message = 'project does not include a single video element';
            console.log(message);
            throw new Error(message);
        }
        this.videoElement = videoElements[0];

        // check if VR is enabled
        if (vrParams.vrEnabled) {

            // check if WEBVR is available
            if (WEBVR.isLatestAvailable() === false) {
                document.body.appendChild(WEBVR.getMessage());
            }
        }

        // add the stats
        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        // obtain parameters, applying defaults where necessary
        this.vrParams = vrParams;
        if (vrParams.camera.direction) {
            vrParams.camera.direction.normalize();
        } else {
            // Note: this has no effect when vrEnabled is set.
            // in those cases the VRControls library takes over the camera direction.
            vrParams.camera.direction = new THREE.Vector3(0, 0, -1);
        }

        // create scene and camera
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            vrParams.camera.fov,
            vrParams.camera.aspect,
            vrParams.camera.near,
            vrParams.camera.far);
        this.camera.up = new THREE.Vector3(0, 1, 0);
        this.camera.lookAt(vrParams.camera.direction);
        this.camera.layers.enable(1); // render left view when no stereo is available

        // add crosshairs
        if (vrParams.crosshairs) {
            this.crosshairs = new Crosshairs();
            this.crosshairs.init(this.scene, vrParams.crosshairs, this.eventEmitter);
        }

        // add an audio listener
        // for now we assume that the audio is a positional audio source
        if (vrParams.audio) {
            this.audio = new Audio();
            this.audio.setup(this, vrParams);
        }

        // create renderer
        let rendererOptions = {
            antialias: true
        };

        // if a canvas was provided, use it
        if (vrParams.canvas) {
            rendererOptions.canvas = vrParams.canvas;
        }
        this.renderer = new THREE.WebGLRenderer(rendererOptions);
        this.renderer.setSize(vrParams.renderer.width, vrParams.renderer.height);
        this.renderer.autoClear = false;
        this.renderer.sortObjects = false;
        this.renderer.setClearColor(0x505050);
        document.body.appendChild(this.renderer.domElement);

        // control orientation
        if (vrParams.vrEnabled) {
            // VR case: use VRControls
            this.controls = new THREE.VRControls(this.camera);
            this.controls.standing = true;
        } else {
            // non-VR case: use threeVR
            this.controls = new DeviceOrientationController(this.camera);
            this.controls.connect();
        }

        // create ThreeJS mesh sphere onto which our texture will be drawn
        this.sphere = {};
        if (!vrParams.sphere360 || !vrParams.sphere360.hide) {

            this.sphere.video = this.videoElement;
            this.sphere.texture = new THREE.Texture(this.sphere.video);
            this.sphere.texture.generateMipmaps = false;
            this.sphere.texture.minFilter = THREE.LinearFilter;
            this.sphere.texture.magFilter = THREE.LinearFilter;
            this.sphere.texture.format = THREE.RGBFormat;

            if (vrParams.stereoscopic) {

                // right
                let geometry = new THREE.SphereGeometry(500, 60, 40);
                geometry.scale(-1, 1, 1);
                this.setUVMapping('right', geometry);
                let material = new THREE.MeshBasicMaterial({
                    map: this.sphere.texture
                });
                let mesh = new THREE.Mesh(geometry, material);
                mesh.layers.set(2); // display in right eye only
                this.scene.add(mesh);
                this.rightGeometry = geometry;

                // left
                geometry = new THREE.SphereGeometry(500, 60, 40);
                geometry.scale(-1, 1, 1);
                this.setUVMapping('left', geometry);
                material = new THREE.MeshBasicMaterial({
                    map: this.sphere.texture
                });
                mesh = new THREE.Mesh(geometry, material);
                mesh.layers.set(1); // display in left eye only
                this.scene.add(mesh);
                this.leftGeometry = geometry;
            } else {
                this.sphere.radius = 500;
                this.sphere.mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(this.sphere.radius, 80, 50),
                    new THREE.MeshBasicMaterial({
                        map: this.sphere.texture
                    }));
                this.sphere.mesh.scale.x = -1; // mirror the texture, since we're looking from the inside out
                this.scene.add(this.sphere.mesh);
            }
        }

        // create buttons
        for (let o in vrParams.objects) {
            if (vrParams.objects.hasOwnProperty(o)) {
                let vrObj = vrParams.objects[o];
                let objMaterial = new THREE.MeshPhongMaterial({
                    color: vrObj.color,
                    specular: 0x111111,
                    shininess: 70
                });
                this.addOBJ(vrObj.resource, o, vrObj.position, objMaterial);
            }
        }

        // these objects need a light
        let light = new THREE.PointLight(0xffffff, 1, 10000);
        light.position.copy(vrParams.light.position);
        this.scene.add(light);

        // if VR is enabled, add the controllers (VIVE)
        // TODO: how to auto-detect VIVE?
        if (vrParams.vrEnabled) {

            // VIVE controller 1
            this.controller1 = new THREE.ViveController(0);
            this.controller1.standingMatrix = this.controls.getStandingMatrix();
            this.scene.add(this.controller1);

            // VIVE controller 2
            this.controller2 = new THREE.ViveController(1);
            this.controller2.standingMatrix = this.controls.getStandingMatrix();
            this.scene.add(this.controller2);

            // VIVE controller OBJ
            let vivePath = '../resources/models/obj/vive-controller/';
            let loader = new THREE.OBJLoader();
            loader.load(vivePath + 'vr_controller_vive_1_5.obj', function(object) {
                let loader = new THREE.TextureLoader();
                let controller = object.children[0];
                controller.material.map = loader.load(vivePath + 'onepointfive_texture.png');
                controller.material.specularMap = loader.load(vivePath + 'onepointfive_spec.png');
                that.controller1.add(object.clone());
                that.controller2.add(object.clone());
            });

            // the VR effect
            this.effect = new THREE.VREffect(this.renderer);

            if (WEBVR.isAvailable() === true) {
                console.log('webvr is available. adding button...');
                document.body.appendChild(WEBVR.getButton(this.effect));
            }

            // window resize
            window.addEventListener('resize', this.onWindowResize.bind(this), false);
        }
    }

    // handle key
    updateGeometry(parm, delta) {

        this.resetUVMapping('right', this.rightGeometry);
        this.resetUVMapping('left', this.leftGeometry);

        this.UVMapFactors["top-to-bottom"]["right"][parm] += delta;
        this.UVMapFactors["top-to-bottom"]["left"][parm] += delta;
        this.UVMapFactors["left-to-right"]["right"][parm] += delta;
        this.UVMapFactors["left-to-right"]["left"][parm] += delta;

        this.setUVMapping('right', this.rightGeometry);
        this.setUVMapping('left', this.leftGeometry);

        console.log(JSON.stringify(this.UVMapFactors, null, 4));
    }

    // handle click by looking for intersecting objects
    handleClick(event, cb) {

        // normalize xy
        this.mouse.x = (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (this.clickableObjects.length === 0)
            return;

        // build array of intersection candidates
        let o;
        let intersectionObjects = [];
        for (o in this.objects) {
            if (this.objects.hasOwnProperty(o)) {
                intersectionObjects.push(this.objects[o]);
            }
        }

        // collect intersections
        let intersects = this.raycaster.intersectObjects(intersectionObjects, true);
        if (intersects.length > 0) {

            console.log('hit something');

            // trigger event and call the callbacks
            for (o in this.objects) {
                if (this.objects.hasOwnProperty(o)) {
                    if (this.objects[o].children.includes(intersects[0].object) &&
                        typeof cb === 'function') {
                        cb(o);
                    }
                }
            }
        }
    }

    // start rendering
    start() {
        this.videoPlaying = true;
        this.doAnimationFrame();
    }
}

module.exports = Veri;
window.Veri = Veri;
