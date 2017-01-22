[![veri logo](https://s3.amazonaws.com/veri.namel/logo.png)](https://namel.github.io/veri/)


# A Virtual Reality Web Video Player

This javascript library makes it easy to play VR videos from a browser.
You can use it to play VR videos in **HTC Vive**, **Oculus Rift**, and **Samsung
Gear**.  It provides the functionality which is often useful with VR videos,
such as headset movement detection; ambisonic audio interface; hand-held
controller interface and rendering; rendering of 3D OBJ objects over the
video layer, or inside the VR scene; crosshairs support, with animated
buttons, or animated crosshairs.

When embedded in an HTML page, Veri will set up a WebGL canvas and a THREE.js WebVR environment which renders a VR video.  It can play stereoscopic videos (side-by-side and
top-to-bottom) as well as monoscopic videos.

To view the video you will need a browser which supports WebVR.  For *HTC
Vive* this means you will need to download a special build of Chromium.  For
*Oculus Rift* you will need a WebVR version of Mozilla, and on *Samsung Gear* you
can use the Samsung Internet browser.  See [WebVR Info](webvr.info) for
more information on that.

For a regular PC or Mac with no headset attached, you can still view 360
videos, or add the [WebVR API Emulation](https://chrome.google.com/webstore/detail/webvr-api-emulation/gbdnpaebafagioggnhkacnaaahpiefil) extension which shows you what would be seen on the headset.

For more information see the [veri Home Page](https://namel.github.io/veri/)


### Worked Example ###

For basic usage, you must include the veri library and a video element:

```html
<script src="../dist/veri.js"></script>
<video
id="veri"
crossorigin="anonymous"
autoplay
loop
src="https://threejs.org/examples/textures/MaryOculus.webm"
style="display: none; width: 100%; height: 100%; background: black;" />
```

Then you setup the VR options and start playing:

```javascript
var veri = new Veri();

veri.setup({
    controls: "auto",
    vrEnabled: true,
    stereoscopic: "left-to-right",
    initializeCanvas: true,
    camera: {
        fov: 90,          // wider -> narrower  (10..100)
        aspect: window.innerWidth / window.innerHeight,
        near: 0.1,
        far: 1000
    },
    renderer: {
        width: window.innerWidth,
        height: window.innerHeight
    },
    light: {
        position: Veri.vec3(2, 2, 2)
    }
});

veri.start();
```


### For True VR ###

True VR experiences require a VR headset, such as HTC Vive, Oculus Rift, or Samsung Gear.  This implies two camera perspectives will be rendered.  The implementation is based on WebVR and Three.js.

### Full Functionality List ###

The VR plugin supports the following:

* setup a [THREE js](http://threejs.org/) canvas
* setup a scene: camera, lighting, walls
* setup VR (requires VR hardware)
* setup stereoscopic VR, which provides depth
    * side-by-side frames supported
    * top-to-bottom frames supported
* setup a monoscopic 360 video
* crosshairs - a small object at the center of the field of vision for pointing to targets in the VR scene
    * default circle animation
    * supports sprite animation
        * buttons can be animations
        * the crosshairs can be animated
* setup interaction objects using an overlay.  Objects are 3D objects and their textures, provided in OBJ file format.
    * overlay fixed in the camera's reference frame
    * overlay fixed in the video's reference frame
* interaction handling
    * device-driven movement (rotation of mobile device, movement of headset)
    * panning with mouse drag for 360 video
    * zoom in/out with mouse wheel for 360 video
    * limit interaction space to avoid overlap with control bar on top and bottom
    * keyboard control
* RayCasting - detect which object was clicked in the scene
* audio implemented by [jsAmbisonics](https://github.com/polarch/JSAmbisonics)
    * positional audio sources
    * ambisonic audio sources
* general event emitter functionality

The following are not yet supported:

* iPhone 360 video
* debugging helpers
    * show axis
    * show fps

### Complete annotated list of configuration options ###

```javascript
veri.setup({

    // controls:
    // "auto" will auto-detect.  Can be set to "device", "mouse"
    controls: "auto",     // auto-detect

    // vrEnabled:
    // if set to true, and VR hardware is found, then the
    // the video is rendered on the VR hardware, using WebVR
    vrEnabled: true,

    // polyfillWebVR:
    // if set to true, WebVR is poly-filled-in
    // to control from URL query string, set this to
    // !!window.location.search.match("polyfill")
    polyfillWebVR: false,

    // stereoscopic:
    // can be set to "side-by-side" if the eye frames
    // are next to each other, or "top-to-bottom"
    // monoscopic videos don't set this.
    stereoscopic: "side-by-side",

    // debug:  (OPTIONAL)
    // here you can request display of axis or fps
    debug: {
        showAxis: false,
        showFPS: false
    },

    // camera:
    // position and camera settings.  For more information refer to THREEjs.
    // camera direction is only relevant when vrEnabled is false.  When it is
    // set to true the vr-input device controls already provide a direction.
    camera: {
        pos: Veri.vec3(0, 0, 0),
        fov: 35,          // wider -> narrower  (10..100)
        aspect: window.innerWidth / window.innerHeight,
        near: 0.1,
        far: 1000,
        direction: Veri.vec3(0, 0, -1) // the lookAt vector3
    },

    // Animated Crosshairs
    //
    // provide a list of targets that the crosshairs can activate
    // each target must have a name and direction.  The direction is
    // specified using Veri.rot3 (syntactic sugar for THREE.Euler),
    // reduced to theta (vertical angle) and phi (horizontal angle)
    //
    // hitRadius - radians offset which is considered
    //     part of the target
    //
    // hitTime - time in milliseconds until the target is considered "clicked"
    //
    // sprite - optional sprite for animation.  Must be a "power-of-two" image,
    //     meaning the width and height must be powers of two, though not necessarily
    //     identical to each other. Includes attributes:
    //     src - url
    //     columns, rows - columns and rows in the sprite
    //     count - number of actual images in the sprite.
    //     objWidth, objHeight - size of invisible rectangle used to project the sprite.
    //     width, height - if the images are not exact fractions of the sprite
    //            width and height, specify them here.
    //
    //     If sprite is not specified
    //     then a small ring is used to indicate selection progress
    //
    // Note: use the event emitter to determine crosshairs state.
    crosshairs: {
        type: "animated-crosshairs",
        debug: false,
        targets: [ {
            name: "play",
            direction: Veri.rot3(0, -100)
        }, {
            name: "stop",
            direction: Veri.rot3(0, -80)
        }],
        hitRadius: 10,
        hitTime: 6000,
        sprite: {
            src: "../resources/sprite/circle.png",
            distance: 300,
            columns: 8,
            rows: 8,
            count: 60,
            objWidth: 60,
            objHeight: 60,
            width: 60,
            height: 60
        }
    },

    // Animated buttons
    //
    // Rather than having an animated crosshairs, in this case the
    // buttons themselves start animating when a static crosshairs enters
    // the button area.
    //
    // Provide a list of animated targets that the crosshairs can activate.
    // Each target must have a name and direction, a hitRadius, a hitTime,
    // and the corresponding sprite descriptor.  The sprite has its own
    // direction but it typically matches the target.
    //
    // sprite - describe the actual crosshairs image.  Not really a sprite
    //
    // Note: use the event emitter to determine crosshairs state.
    crosshairs: {
        type: "animated-buttons",
        debug: false,
        targets: [{
            name: "start",
            direction: Veri.rot3(0, -100),
            hitRadius: 16,
            hitTime: 6000,
            sprite: {
                // same as above, but also include a direction
                direction: Veri.rot3(0, -100)
            }
        }],
        sprite: {
            src: "resources/img/crosshairs.png",
            distance: 380,
            objWidth: 50,
            objHeight: 50,
            columns: 1,
            rows: 1,
            count: 1
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
        src: "https://upload.wikimedia.org/wikipedia/commons/2/2a/20091104_Alisa_Weilerstein_and_Jason_Yoder_-_Saint_Sa%C3%ABns%27_The_Swan.ogg",
        position: Veri.vec3(0, 0, -10)
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
            position: Veri.vec3(-1, 0, -5),
            color: 0xc8955c,
            movesWithCamera: false,
            handler: clickHandler  
        },
        goButton: {
            resource: 'resources/obj/s-rev-fwd.obj',
            position: Veri.vec3(1, 0, -5),
            color: 0xc8955c,
            movesWithCamera: false,
            handler: clickHandler
        }
    },

    // light: (OPTIONAL)
    // this is only needed if objects are provided, to light up those objects.
    light: {
        position: Veri.vec3(2, 2, 2)
    }
});
```

### Events ###

`click` - emitted when the user clicked on an object.

```javascript
veri.on('click', function(objName) {
        console.log('you clicked on ' + objName);
});
```

`frame` - emitted on every frame, it contains a Vector3 which reflects the
camera direction.  For example, you can use this to check if the viewer
is currently looking at a specific angle range.

Sample code to check angle:
```javascript
veri.on('frame', function(camera) {
    var directionOnXZPlane = camera.projectOnPlane(Veri.vec3(0, 1, 0));
    var quaternion = (new THREE.Quaternion()).setFromUnitVectors(cameraCenter, directionOnXZPlane);
    var euler = (new THREE.Euler()).setFromQuaternion(quaternion);
    var angle = euler.y;
});
```

`ready` - emitted when the 3D scene is built.

```javascript
veri.on('ready', function(objName) {
    console.log('vr setup complete');
});
```

`targetEnter` - crosshairs have entered a named target.

```javascript
veri.on('targetEnter', function(target) {
    console.log('looking at ' + target);
});
```

`targetExit` - crosshairs have exited a named target.

```javascript
veri.on('targetExit', function(target) {
    console.log('no longer looking at ' + target);
});

```

`targetStay` - crosshairs are still inside a named target.

```javascript
veri.on('targetStay', function(target) {
    console.log('still looking at ' + target);
});
```

`targetSelected` - crosshairs have stayed inside a named target enough time so that the target is now selected ("clicked").

```javascript
veri.on('targetSelected', function(target) {
        console.log('crosshairs selected target: ' + target);
});
```
