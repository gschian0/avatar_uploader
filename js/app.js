import * as THREE from "three";
import fragment from "./shader/fragment.glsl";
import vertex from "./shader/vertex.glsl";
import dat from "../node_modules/three/examples/jsm/libs/dat.gui.module";
import { OrbitControls } from "../node_modules/three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import uncle_jerry from './uncle_jerry.glb'
import dot from './DEEDOT000.glb'
import dotText from './dolla_text3.gltf'
import typefaceFont from 'three/examples/fonts/droid/droid_sans_bold.typeface.json'
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
// import { FontLoader } from 'FontLoader.js';
import {
	FileLoader,
	Loader,
	ShapePath
} from 'three/build/three.module.js';

class FontLoader extends Loader {

	constructor( manager ) {

		super( manager );

	}

	load( url, onLoad, onProgress, onError ) {

		const scope = this;

		const loader = new FileLoader( this.manager );
		loader.setPath( this.path );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( scope.withCredentials );
		loader.load( url, function ( text ) {

			let json;

			try {

				json = JSON.parse( text );

			} catch ( e ) {

				console.warn( 'THREE.FontLoader: typeface.js support is being deprecated. Use typeface.json instead.' );
				json = JSON.parse( text.substring( 65, text.length - 2 ) );

			}

			const font = scope.parse( json );

			if ( onLoad ) onLoad( font );

		}, onProgress, onError );

	}

	parse( json ) {

		return new Font( json );

	}

}

//

class Font {

	constructor( data ) {

		this.type = 'Font';

		this.data = data;

	}

	generateShapes( text, size = 100 ) {

		const shapes = [];
		const paths = createPaths( text, size, this.data );

		for ( let p = 0, pl = paths.length; p < pl; p ++ ) {

			Array.prototype.push.apply( shapes, paths[ p ].toShapes() );

		}

		return shapes;

	}

}

function createPaths( text, size, data ) {

	const chars = Array.from( text );
	const scale = size / data.resolution;
	const line_height = ( data.boundingBox.yMax - data.boundingBox.yMin + data.underlineThickness ) * scale;

	const paths = [];

	let offsetX = 0, offsetY = 0;

	for ( let i = 0; i < chars.length; i ++ ) {

		const char = chars[ i ];

		if ( char === '\n' ) {

			offsetX = 0;
			offsetY -= line_height;

		} else {

			const ret = createPath( char, scale, offsetX, offsetY, data );
			offsetX += ret.offsetX;
			paths.push( ret.path );

		}

	}

	return paths;

}

function createPath( char, scale, offsetX, offsetY, data ) {

	const glyph = data.glyphs[ char ] || data.glyphs[ '?' ];

	if ( ! glyph ) {

		console.error( 'THREE.Font: character "' + char + '" does not exists in font family ' + data.familyName + '.' );

		return;

	}

	const path = new ShapePath();

	let x, y, cpx, cpy, cpx1, cpy1, cpx2, cpy2;

	if ( glyph.o ) {

		const outline = glyph._cachedOutline || ( glyph._cachedOutline = glyph.o.split( ' ' ) );

		for ( let i = 0, l = outline.length; i < l; ) {

			const action = outline[ i ++ ];

			switch ( action ) {

				case 'm': // moveTo

					x = outline[ i ++ ] * scale + offsetX;
					y = outline[ i ++ ] * scale + offsetY;

					path.moveTo( x, y );

					break;

				case 'l': // lineTo

					x = outline[ i ++ ] * scale + offsetX;
					y = outline[ i ++ ] * scale + offsetY;

					path.lineTo( x, y );

					break;

				case 'q': // quadraticCurveTo

					cpx = outline[ i ++ ] * scale + offsetX;
					cpy = outline[ i ++ ] * scale + offsetY;
					cpx1 = outline[ i ++ ] * scale + offsetX;
					cpy1 = outline[ i ++ ] * scale + offsetY;

					path.quadraticCurveTo( cpx1, cpy1, cpx, cpy );

					break;

				case 'b': // bezierCurveTo

					cpx = outline[ i ++ ] * scale + offsetX;
					cpy = outline[ i ++ ] * scale + offsetY;
					cpx1 = outline[ i ++ ] * scale + offsetX;
					cpy1 = outline[ i ++ ] * scale + offsetY;
					cpx2 = outline[ i ++ ] * scale + offsetX;
					cpy2 = outline[ i ++ ] * scale + offsetY;

					path.bezierCurveTo( cpx1, cpy1, cpx2, cpy2, cpx, cpy );

					break;

			}

		}

	}

	return { offsetX: glyph.ha * scale, path: path };

}
export default class Sketch {
  constructor(options) {
    
    this.fontLoader = new FontLoader();
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.gltfLoader = new GLTFLoader();
    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xeeeeee, 1);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.composer = new EffectComposer( this.renderer );
    this.composer.outputEncoding = THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      90,
      window.innerWidth / window.innerHeight,
      0.001,
      1000
    );

    // var frustumSize = 10;
    // var aspect = window.innerWidth / window.innerHeight;
    // this.camera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, -1000, 1000 );
    this.camera.position.set(0, 0, 2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.time = 0;

    this.isPlaying = true;

    const renderPass = new RenderPass( this.scene, this.camera );
    this.composer.addPass( renderPass );

    const glitchPass = new GlitchPass();
    this.composer.addPass( glitchPass );

    this.addObjects();
    // this.loadFont();
    this.resize();
    this.render();
    this.setupResize();
    // this.settings();
  }

  settings() {
    let that = this; //eslint-disable-line
    this.settings = {
      progress: 0,
    };
    this.gui = new dat.GUI();
    this.gui.add(this.settings, "progress", 0, 1, 0.01);
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  loadFont() {
    this.font = this.loader.load(
      // resource URL
      typefaceFont,
    
      // onLoad callback
      function ( font ) {
        // do something with the font
        console.log( font );
      },
    
      // onProgress callback
      function ( xhr ) {
        console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
      },
    
      // onError callback
      function ( err ) {
        console.log( 'An error happened' );
      }
    );
  }

  addObjects() {
    let that = this; //eslint-disable-line
    this.mixer = null;
    this.gltfLoader.load(
      dotText,
      (text) =>
      {
          console.log('success')
          console.log(text)
          this.textObject = text.scene.children[2]
          this.textObject.material = new THREE.MeshNormalMaterial({});
          this.scene.add(this.textObject);
          // console.log(text.scene);
          // console.log(text.scene.children)
          this.textObject.position.set(0, 0.5,1);
          this.textObject.scale.set(0.2, 0.2, 0.2);
        //  this.textObject.scene.rotation.set(0, 0 ,0);
          
 
      },
      (progress) =>
      {
          console.log('progress')
          console.log(progress)
      },
      (error) =>
      {
          console.log('error')
          console.log(error)
      }
    )

    // this.gltfLoader.load(
    //   uncle_jerry,
    //   (uj) =>
    //   {
    //       console.log('success')
    //       console.log(uj)
         
    //       this.scene.add(uj.scene);
    //       // console.log(text.scene);
    //       // console.log(text.scene.children)
    //       this.textObject.position.set(0, 0.5,1);
    //       this.textObject.scale.set(0.2, 0.2, 0.2);
    //     //  this.textObject.scene.rotation.set(0, 0 ,0);
          
 
    //   },
    //   (progress) =>
    //   {
    //       console.log('progress')
    //       console.log(progress)
    //   },
    //   (error) =>
    //   {
    //       console.log('error')
    //       console.log(error)
    //   }
    // )
    this.gltfLoader.load(
      dot,
      (gltf) =>
      {
          console.log('success')
          console.log(gltf)
          this.scene.add(gltf.scene);
          gltf.scene.position.set(0, -1, 1.33);
         
          this.mixer = new THREE.AnimationMixer(gltf.scene)
        const action = this.mixer.clipAction(gltf.animations[0])
        action.play()
      },
      (progress) =>
      {
          console.log('progress')
          console.log(progress)
      },
      (error) =>
      {
          console.log('error')
          console.log(error)
      }
  )
    this.sphereGeo = new THREE.SphereBufferGeometry(10, 32, 32);
    this.sphereMat = new THREE.MeshNormalMaterial({side: THREE.BackSide});
    this.sphere = new THREE.Mesh(this.sphereGeo, this.sphereMat);
    this.scene.add(this.sphere);
    this.light = new THREE.HemisphereLight(0xffffff, 0x444444);
    this.scene.add(this.light)
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable",
      },
      side: THREE.DoubleSide,
      uniforms: {
        time: { type: "f", value: 0 },
        resolution: { type: "v4", value: new THREE.Vector4() },
        uvRate1: {
          value: new THREE.Vector2(1, 1),
        },
      },
      // wireframe: true,
      // transparent: true,
      vertexShader: vertex,
      fragmentShader: fragment,
    });

    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);

    this.plane = new THREE.Mesh(this.geometry, this.material);

    // this.scene.add(this.plane);
  }

  stop() {
    this.isPlaying = false;
  }

  play() {
    if (!this.isPlaying) {
      this.render();
      this.isPlaying = true;
    }
  }

  render() {
    if (!this.isPlaying) return;
    this.time += 0.0005;
    this.material.uniforms.time.value = this.time;
    if(this.mixer != null){
    this.mixer.update(this.clock.getDelta());
    }
    requestAnimationFrame(this.render.bind(this));
    this.renderer.render(this.scene, this.camera);
    // this.composer.render();
  }
}

new Sketch({
  dom: document.getElementById("container"),
});
