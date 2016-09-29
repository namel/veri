const THREE = require('three');

class Crosshairs {

    constructor() {

        // globals
        this.ringBufferMesh = null;
        this.crosshairsSprite = null;
        this.spriteTexture = null;
        this.spriteLoadingStarted = null;
        this.scene = null;
        this.params = null;
        this.eventEmitter = null;
        this.debugCounter = 0;

        // state
        this.lastTarget = null;
        this.hitStart = null;
        this.hitPercent = 0;
        this.lastPercent = -1;
    }

    showVec(v) {
        return `[${v.x}, ${v.y}, ${v.z}]`;
    }

    init(_scene, _params, _eventEmitter) {
        this.scene = _scene;
        this.params = _params;
        this.eventEmitter = _eventEmitter;
    }

    updateSprite(percent, position) {

        if (!this.spriteLoadingStarted) {

            // instantiate a loader
            var loader = new THREE.TextureLoader();

            // load a resource
            this.spriteLoadingStarted = true;
            loader.load(this.params.sprite.src, function(_spriteTexture) {
                this.spriteTexture = _spriteTexture;
                this.spriteTexture.wrapS = this.spriteTexture.wrapT = THREE.RepeatWrapping;
                this.spriteTexture.repeat.set(1 / this.params.sprite.columns, 1 / this.params.sprite.rows);
                var spriteMaterial = new THREE.MeshBasicMaterial({
                    transparent: true,
                    map: this.spriteTexture,
                    side: THREE.DoubleSide
                });
                var geometry = new THREE.PlaneGeometry(50, 50, 1, 1);
                this.crosshairsSprite = new THREE.Mesh(geometry, spriteMaterial);
                this.scene.add(this.crosshairsSprite);
                console.log("crosshairs sprite finished loading");
            });
        }

        if (!this.crosshairsSprite) {
            return;
        }

        // TODO: position and orientation are similar here and below
        // and in the general case of objects.  This code should be
        // in a common lib
        this.crosshairsSprite.position.copy(position).multiplyScalar(200);
        var cameraRotationQuaternion = (new THREE.Quaternion())
            .setFromUnitVectors(new THREE.Vector3(0, 0, 1), position);
        this.crosshairsSprite.rotation.setFromQuaternion(cameraRotationQuaternion);

        // update the sprite
        var imageIndex = Math.floor(this.params.sprite.count * percent);
        var col = imageIndex % this.params.sprite.columns;
        var row = (Math.floor(imageIndex / this.params.sprite.columns));
        this.spriteTexture.offset.x = col / this.params.sprite.columns;
        this.spriteTexture.offset.y = 1 - row / this.params.sprite.rows;
        if (this.spriteTexture.offset.y !== window.oldY ||
            this.spriteTexture.offset.x !== window.oldX) {
            window.oldY = this.spriteTexture.offset.y;
            window.oldX = this.spriteTexture.offset.x;
            if (this.params.debug) {
                console.log(`setting sprites to ${this.spriteTexture.offset.x} ${this.spriteTexture.offset.y}`);
            }
        }

        // debug
        if (this.params.debug && this.debugCounter % 90 === 0) {
            console.log(`sprite position = ${this.showVec(this.crosshairsSprite.position)}`);
            console.log(`sprite rotation = ${this.showVec(this.crosshairsSprite.rotation)}`);
        }
    }

    updateCrosshairs(percent, position) {

        if (this.ringBufferMesh) {
            this.scene.remove(this.ringBufferMesh);
            this.ringBufferMesh = null;
        }
        var ringBufferGeometry = new THREE.RingBufferGeometry(
            8 * (1 - percent), 10 * (1 + percent), 20, 10, Math.PI, Math.PI * (1 + percent));
        var ringBufferMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            side: THREE.DoubleSide
        });
        this.ringBufferMesh = new THREE.Mesh(ringBufferGeometry, ringBufferMaterial);
        this.ringBufferMesh.position.copy(position).multiplyScalar(200);
        var cameraRotationQuaternion = (new THREE.Quaternion())
            .setFromUnitVectors(new THREE.Vector3(0, 0, 1), position);
        this.ringBufferMesh.rotation.setFromQuaternion(cameraRotationQuaternion);
        this.scene.add(this.ringBufferMesh);

        // debug
        if (this.params.debug && this.debugCounter % 90 === 0) {
            console.log(`ring position = ${this.showVec(this.ringBufferMesh.position)}`);
            console.log(`ring rotation = ${this.showVec(this.ringBufferMesh.rotation)}`);
        }
    }

    update(cameraDirection) {

        // check targets
        this.debugCounter++;
        var targets = this.params.targets;
        var nextTarget = null;

        for (var t in targets) {
            if (targets.hasOwnProperty(t)) {
                var target = this.params.targets[t];
                var angle = target.direction.angleTo(cameraDirection);

                // show angle to targets for debugging purposes
                if (this.debugCounter % 90 === 0) {
                    console.log(`angle to ${target.name} is ${angle / Math.PI * 180}`);
                }

                if (angle <= this.params.hitRadius) {
                    if (nextTarget !== null) {
                        console.log('ERROR!  overlapping targets');
                    }
                    nextTarget = target.name;
                }
            }
        }

        // emit events
        this.hitPercent = 0;
        if (nextTarget !== null && this.lastTarget === null) {
            if (this.eventEmitter) this.eventEmitter.emitEvent('vr.targetEnter', [nextTarget]);
            this.hitStart = (new Date()).getTime();
        } else if (nextTarget === null && this.lastTarget !== null) {
            if (this.eventEmitter) this.eventEmitter.emitEvent('vr.targetExit', [this.lastTarget]);
            this.hitStart = 0;
        } else if (nextTarget !== null) {
            if (this.eventEmitter) this.eventEmitter.emitEvent('vr.targetStay', [nextTarget]);
            var elapsed = (new Date()).getTime() - this.hitStart;
            if (elapsed < this.params.hitTime) {
                this.hitPercent = elapsed / this.params.hitTime;
            } else if (elapsed >= this.params.hitTime) {
                if (this.eventEmitter) this.eventEmitter.emitEvent('vr.targetSelected', [nextTarget]);
                console.log('target selected ', nextTarget);
                this.hitStart = 0;
                this.hitPercent = 1.0;
                nextTarget = null;
            }
        }
        this.lastTarget = nextTarget;

        // move the crosshairs
        if (this.lastPercent !== this.hitPercent) {
            this.lastPercent = this.hitPercent;
            if (this.params.sprite) {
                this.updateSprite(this.hitPercent, cameraDirection);
            } else {
                this.updateCrosshairs(this.hitPercent, cameraDirection);
            }
        }
    }
}

module.exports = Crosshairs;
