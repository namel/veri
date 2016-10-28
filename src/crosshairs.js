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

    init(scene, params, eventEmitter) {
        this.scene = scene;
        this.params = params;
        this.eventEmitter = eventEmitter;

        // check the crosshairs type
        if (params.type !== 'animated-crosshairs' && params.type !== 'animated-buttons') {
            var msg = 'unknown crosshairs type';
            console.log(msg);
            throw new Error(msg);
        }
    }

    updateSprite(percent, direction, position) {

        // load the sprite image now if this hasn't happened yet
        var sprite = this.params.sprite;
        if (!this.spriteLoadingStarted) {

            // instantiate a loader
            var loader = new THREE.TextureLoader();
            loader.crossOrigin = "";

            // load a resource
            this.spriteLoadingStarted = true;
            loader.load(sprite.src, spriteTexture => {
                sprite.texture = spriteTexture;
                sprite.texture.wrapS = sprite.texture.wrapT = THREE.RepeatWrapping;

                var repeatX = 1 / sprite.columns;
                var repeatY = 1 / sprite.rows;
                sprite.texture.repeat.set(repeatX, repeatY);
                var geometry = new THREE.PlaneGeometry(sprite.objWidth, sprite.objHeight, 1, 1);
                var spriteMaterial = new THREE.MeshBasicMaterial({
                    transparent: true,
                    map: sprite.texture,
                    side: THREE.DoubleSide
                });

                sprite.mesh = new THREE.Mesh(geometry, spriteMaterial);
                sprite.mesh.position.copy(direction).multiplyScalar(sprite.distance);
                sprite.mesh.lookAt(new THREE.Vector3(0, 0, 0));
                this.scene.add(sprite.mesh);
                console.log("crosshairs sprite finished loading");
            });
        }

        // no mesh? try later
        if (!sprite.mesh) {
            return;
        }

        // option to remove the sprite
        sprite.mesh.visible = !sprite.hide;

        // if the crosshairs sprite direction changes, update position and rotation
        if (direction) {
            if (direction instanceof THREE.Euler) {
                direction = (new THREE.Vector3(0, 1, 0)).applyEuler(direction);
            }
            sprite.mesh.position.copy(direction).multiplyScalar(sprite.distance);
            sprite.mesh.lookAt(new THREE.Vector3(0, 0, 0));
        }

        // update the sprite
        var imageIndex = Math.floor(sprite.count * percent);

        sprite.texture.offset.x = (imageIndex % sprite.columns) / sprite.columns;
        sprite.texture.offset.y = 1 - (Math.floor(imageIndex / sprite.columns) + 1) / sprite.rows;

        if (sprite.texture.offset.y !== window.oldY ||
            sprite.texture.offset.x !== window.oldX) {
            window.oldY = sprite.texture.offset.y;
            window.oldX = sprite.texture.offset.x;
            if (this.params.debug) {
                var offset = sprite.texture.offset;
                console.log(`percent=${percent} setting sprites to ${offset.x} ${offset.y}`);
            }
        }

        // debug
        if (this.params.debug && this.debugCounter % 90 === 0) {
            console.log(`sprite position = ${this.showVec(sprite.mesh.position)}`);
            console.log(`sprite rotation = ${this.showVec(sprite.mesh.rotation)}`);
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
        var nextTargetObj = null;

        for (var t in targets) {
            if (targets.hasOwnProperty(t)) {
                var target = this.params.targets[t];

                // target may be disabled
                if (target.disabled)
                    continue;

                var targetDirection = (new THREE.Vector3(0, 1, 0)).applyEuler(target.direction);
                var angle = targetDirection.angleTo(cameraDirection);
                var angleDegrees = Math.floor(angle / Math.PI * 1800) / 10;
                var hitRadius = target.hitRadius ? target.hitRadius : this.params.hitRadius;

                // show angle to targets for debugging purposes
                if (this.debugCounter % 90 === 0)
                    console.log(`crosshairs: angle to target [${target.name}] is ${angleDegrees}\u00B0`);

                if (angleDegrees <= hitRadius) {
                    if (nextTarget !== null) {
                        console.log('ERROR!  overlapping targets');
                    }
                    nextTarget = target.name;
                    nextTargetObj = target;
                }
            }
        }

        // emit events
        this.hitPercent = 0;
        if (nextTarget !== null && this.lastTarget === null) {
            if (this.eventEmitter) this.eventEmitter.emit('targetEnter', [nextTarget]);
            this.hitStart = (new Date()).getTime();
        } else if (nextTarget === null && this.lastTarget !== null) {
            if (this.eventEmitter) this.eventEmitter.emit('targetExit', [this.lastTarget]);
            this.hitStart = 0;
        } else if (nextTarget !== null) {
            var hitTime = nextTargetObj.hitTime ? nextTargetObj.hitTime : this.params.hitTime;
            if (this.eventEmitter) this.eventEmitter.emit('targetStay', [nextTarget]);
            var elapsed = (new Date()).getTime() - this.hitStart;
            if (elapsed < hitTime) {
                this.hitPercent = elapsed / hitTime;
            } else if (elapsed >= hitTime) {
                if (this.eventEmitter) this.eventEmitter.emit('targetSelected', [nextTarget]);
                console.log(`target selected ${nextTarget}`);
                this.hitStart = 0;
                this.hitPercent = 1.0;
                nextTarget = null;
            }
        }
        this.lastTarget = nextTarget;

        // update crosshairs and target buttons
        if (this.params.type === 'animated-buttons') {

            // update each button to its percent
            for (var tid of Object.keys(targets)) {
                var hitPercentArg = (nextTargetObj === targets[tid]) ? this.hitPercent : 0;
                this.updateSprite(hitPercentArg, targets[tid].sprite.direction, targets[tid].sprite);
            }

            // update the crosshairs
            this.updateSprite(0, cameraDirection, this.params.sprite);
        } else if (this.params.type === 'animated-crosshairs') {
            if (this.lastPercent !== this.hitPercent) {
                this.lastPercent = this.hitPercent;
                if (this.params.sprite) {
                    this.updateSprite(this.hitPercent, cameraDirection, this.params.sprite);
                } else {
                    this.updateCrosshairs(this.hitPercent, cameraDirection);
                }
            }
        }
    }
}

module.exports = Crosshairs;
