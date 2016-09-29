# Eko -  Virtual Reality Plugin #

This plugin allows a project to display 360 and VR videos.  It provides the functionality which
is often useful with 360/VR videos, such as setting up a canvas and a THREE.js environment
which renders a 360/VR video; mouse interaction; headset movement detection; hand-held controller interface and rendering; rendering of 3D OBJ
objects over the video layer, or inside the VR scene, which can serve as buttons, crosshairs, and lots more.

### Worked Example ###

For basic usage, you will start by including the library in your project.  Here is a sample
`loader.js` header which requires the plugin:

```javascript
require.config({
    paths: {
        'InterludePlayer': 'js/lib/player.min',
        'InterludePlayerPlugins': 'js/lib/plugins.min',
        'vr': 'js/lib/vr.min'
    },
    shim: {
        'InterludePlayerPlugins': { deps: ['InterludePlayer'] },
        'vr': { deps: ['InterludePlayer'] }
    }
});
```

Then you will need to initialize the VR plugin:

```javascript
player.vr.setup({
    controls: "auto",     
    vrEnabled: true,
    stereoscopic: false,
    initializeCanvas: true,
    camera: {
        fov: 90,          // wider -> narrower  (10..100)
        aspect: window.innerWidth / window.innerHeight,
        near: 0.1,
        far: 1000,
        direction: player.vr.vec3(0, 0, -1)
    },
    renderer: {
        width: window.innerWidth,
        height: window.innerHeight
    },
    light: {
        position: player.vr.vec3(2, 2, 2)
    }
});
```

Next, you will need to modify the **embed.html** template by adding these libraries.  Best practice is to store local copies which will be CDN-delivered.
~~~~html
<script src="js/lib/three.min.js"></script>
<script src="js/lib/WebVR.js"></script>
<script src="js/lib/VREffect.js"></script>
<script src="js/lib/VRControls.js"></script>
<script src="js/lib/ViveController.js"></script>
<script src="js/lib/OBJLoader.js"></script>
<script src="js/lib/stats.min.js"></script>
~~~~

Lastly, you can start the VR Plugin by calling `player.vr.start();`.  By setting `initializeCanvas` to `true` you indicate that the plugin should initialize the
canvas and register itself to draw each frame.  If you do not set this attribute, then you must initialize the canvas yourself, optionally with the canvas plugin, and make sure that `vr.draw()` is called on every frame - but only while the player is actually playing a video.  The `vr.draw()` function must receive the same four arguments as the canvas plugin API: `draw(canvasElement, canvasContext, videoElement, ctx)`.

### For True VR ###

True VR experiences require a VR headset, such as HTC Vive, Oculus Rift, or Samsung Gear.  This implies two camera perspectives will be rendered.  The implementation is based on WebVR and Three.js.

Ensure the following libraries are included by script tags in the HTML document:
three.js, WebVR.js, VREffect.js, VRControls.js, ViveController.js, OBJLoader.js, stats.js.  Usually they are placed in the subdirectory **js/lib/** on the HTTP root.

For HTC Vive, there is an OBJ resource available which represents the two HTC Vive controllers, along with texture and spec files, assumed to be in the subdirectory **resources/models/obj/vive-controller/**

### Functionality List ###

The VR plugin supports the following:

* setup a [THREE js](http://threejs.org/) canvas
* setup a scene: camera, lighting, walls
* setup VR (requires VR hardware)
* setup stereoscopic VR, which provides depth
    * side-by-side frames supported
    * top-to-bottom frames supported
* setup a 360 video
* setup interaction objects using an overlay.  Objects are 3D objects and their textures, provided in OBJ file format.
    * overlay fixed in the camera's reference frame
    * overlay fixed in the video's reference frame
* debugging tools
    * showing the axis
    * showing fps
* interaction handling
    * panning with mouse drag
    * zoom in/out with mouse wheel
    * limit interaction space to avoid overlap with control bar on top and bottom
    * keyboard control
    * device-driven movement (rotation of mobile device, movement of headset)
* RayCasting - detect which object was clicked in the scene
* audio
    * positional audio sources
    * ambisonic audio sources
* crosshairs - a small object at the center of the field of vision for pointing to targets in the VR scene
    * default circle animation
    * supports sprite animation
* general event emitter functionality

The following are not yet supported:

* RTS
* iPhone special handling
* debugging helpers
    * show axis
    * show fps

### Complete annotated list of configuration options ###

```javascript
player.vr.setup({

    // controls:
    // "auto" will auto-detect.  Can be set to "device", "mouse"
    controls: "auto",     // auto-detect

    // vrEnabled:
    // if set to true, and VR hardware is found, then the
    // the video is rendered on the VR hardware
    vrEnabled: true,

    // stereoscopic:
    // most videos are monoscopic and don't need to set this.
    // can be set to "side-by-side" if the eye frames
    // are next to each other, or "top-to-bottom"
    stereoscopic: "side-by-side",

    // debug:  (OPTIONAL)
    // here you can request display of axis or fps
    debug: {
        showAxis: false,
        showFPS: false
    },

    // initializeCanvas:
    // when set to true, the vr plugin will initialize the canvas for you,
    // and register itself as the canvas draw function.  It will also ensure
    // that it must render when the player is actually playing.
    initializeCanvas: true,

    // camera:
    // position and camera settings.  For more information refer to THREEjs
    camera: {
        pos: player.vr.vec3(0, 0, 0),
        fov: 35,          // wider -> narrower  (10..100)
        aspect: window.innerWidth / window.innerHeight,
        near: 0.1,
        far: 1000,
        direction: player.vr.vec3(0, 0, -1) // the lookAt vector3
    },

    // crosshairs:
    // provide a list of targets that the crosshairs can activate
    // each target must have a name and direction
    // hitRadius - radians offset which is considered
    //     part of the target
    // hitTime - time in milliseconds until the target is considered "clicked"
    // sprite - optional sprite for animation.  Include src,
    //     columns, rows, and count.
    //     If not specified
    //     then a small ring is used to indicate selection progress
    //
    // Note: use the event emitter to determine crosshairs state.
    crosshairs: {
        targets: [ {
            name: "start",
            direction: player.vr.vec3(-1, 0, -1)
        }, {
            name: "exit",
            direction: player.vr.vec3(-1, 0, -1)
        }],
        hitRadius: 0.1,
        hitTime: 6000,
        sprite: {
            src: "../resources/sprite/all2048.png",
            columns: 16,
            rows: 13,
            count: 208
        }
    },

    // renderer:
    // specify width and height
    renderer: {
        width: window.innerWidth,
        height: window.innerHeight
    },

    // sphere360: (OPTIONAL)
    // specify parameters for the rendering sphere.  
    sphere360: {
        radius: 500,
        hide: false
    },

    // audio: (OPTIONAL)
    // supports both positional and ambisonic audio encoded in B-format
    // attributes:
    //     src: url of the source audio file
    //     type: can be "positional" or "ambisonic"
    //     positional: provide a position vector (for positional type)
    audio: {
        type: "positional",
        src: "https://d1w2zhnqcy4l8f.cloudfront.net/projects/vive/audio/BF_rec1.ogg",
        position: player.vr.vec3(0, 0, 0)
    }

    // objects: (OPTIONAL)
    // specify a dictionary of objects which should be rendered.  These typically
    // would be the buttons that the user can click or tap on.  Each object should
    // provide:
    //     resource: a relative path for the OBJ file
    //     movesWithCamera: true if the object must remain fixed in the camera's frame
    //         as the camera moves about
    //     position: if the object does not move with the camera, this is a fixed
    //         position in the scene space.  If it does move with the camera, this
    //         becomes a 3-vector relative to the camera.
    //     color: provide a hex color
    //     handler: function that should be called when the object is clicked.  The name
    //         of the object will be passed to the handler, so the same handler can be
    //         specified on all of the objects if desired.
    objects: {
        stopButton: {
            resource: 'resources/obj/s-stop.obj',
            position: player.vr.vec3(-1, 0, -5),
            color: 0xc8955c,
            movesWithCamera: false,
            handler: clickHandler  
        },
        goButton: {
            resource: 'resources/obj/s-rev-fwd.obj',
            position: player.vr.vec3(1, 0, -5),
            color: 0xc8955c,
            movesWithCamera: false,
            handler: clickHandler
        }
    },

    // light: (OPTIONAL)
    // this is only needed if objects are provided, to light up those objects.
    light: {
        position: player.vr.vec3(2, 2, 2)
    }
});
```

### Events ###

`vr.click` - emitted when the user clicked on an object.

```javascript
player.on('vr.click', function(objName) {
        console.log('you clicked on ' + objName);
});
```

`vr.frame` - emitted on every frame, it contains a vector3 which reflects the
camera direction.  For example, you can use this to check if the viewer
is currently looking at a specific angle range.

Sample code to check angle:
```javascript
player.on('vr.frame', function(camera) {
    var directionOnXZPlane = camera.projectOnPlane(player.vr.vec3(0, 1, 0));
    var quaternion = (new THREE.Quaternion()).setFromUnitVectors(cameraCenter, directionOnXZPlane);
    var euler = (new THREE.Euler()).setFromQuaternion(quaternion);
    var angle = euler.y;
});
```

`vr.ready` - emitted when the 3D scene is built.  The next animation frame will render the scene.

```javascript
player.on('vr.ready', function(objName) {
        console.log('vr setup complete');
});
```

`vr.targetEnter` - crosshairs have entered a named target.

```javascript
player.on('vr.targetEnter', function(target) {
        console.log('looking at ' + target);
});
```

`vr.targetExit` - crosshairs have exited a named target.

```javascript
player.on('vr.targetExit', function(target) {
        console.log('no longer looking at ' + target);
});

```

`vr.targetStay` - crosshairs are still inside a named target.

```javascript
player.on('vr.targetStay', function(target) {
        console.log('still looking at ' + target);
});
```

`vr.targetSelected` - crosshairs have stayed inside a named target enough time so that the target is now selected ("clicked").

```javascript
player.on('vr.targetSelected', function(target) {
        console.log('crosshairs selected target: ' + target);
});
```
