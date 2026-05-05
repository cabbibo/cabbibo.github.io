var G = {};

G.texturesToLoad = [
  ['ubuntuMono'  , 'img/extras/ubuntuMono.png'],
  ['cabbibo' , 'img/icons/cabbibo.png' ],
  ['twitter' , 'img/icons/twitter_1.png' ],
  ['facebook' , 'img/icons/facebook_1.png' ],
  ['soundcloud' , 'img/icons/soundcloud_1.png' ],
  ['matcap' ,'img/rough-aluminium.jpg' ]
  
]

G.mobile = function () { 
  if( navigator.userAgent.match(/Android/i)
  || navigator.userAgent.match(/webOS/i)
  || navigator.userAgent.match(/iPhone/i)
  || navigator.userAgent.match(/iPad/i)
  || navigator.userAgent.match(/iPod/i)
  || navigator.userAgent.match(/BlackBerry/i)
  || navigator.userAgent.match(/Windows Phone/i)
  ){
    return true;
  } else {
    return false;
  }
}();
//G.mobile = true;
G.loader  = new Loader();


G.pages   = {};

// Loaded objects that may be
// Used across pages
G.AUDIO     = {};
G.TEXTURES  = {};
G.GEOS      = {};
G.MATS      = {};

G.audio   = new AudioController();
G.shaders = new ShaderLoader( 'shaders' );
//G.leap    = new Leap.Controller();
//G.gui     = new dat.GUI({});
//G.loader  = new Loader();
G.stats   = new Stats();

G.tv1 = new THREE.Vector3();
G.tv2 = new THREE.Vector3();

G.springLength = 200;
G.maxVel = 30;
G.ballCenter = new THREE.Vector3( 0 , 0 , 0 );

if( !G.mobile ){ G.ballCenter.set( 0 , 0 , -200); }






G.loader.onStart = function(){

  this.onResize();
  this.init();
  this.animate();

  for( var i = 0; i < this.startArray.length; i++ ){

    this.startArray[i]();

  }

}.bind( G );
G.windowSize = new THREE.Vector2( window.innerWidth , window.innerHeight );
G.w             = window.innerWidth;
G.h             = window.innerHeight;
G.ratio         = G.w / G.h
G.camera        = new THREE.PerspectiveCamera( 45 * G.ratio , G.w / G.h , 10 , 100000 );
G.scene         = new THREE.Scene();
G.renderer      = new THREE.WebGLRenderer(); //autoclear:false\
G.clock         = new THREE.Clock();

G.position      = new THREE.Vector3();
G.pageMarker    = new THREE.Mesh(
  new THREE.IcosahedronGeometry( 40,2 ),
  new THREE.MeshBasicMaterial({color:0xffffff})
);

//G.scene.add( G.pageMarker );

G.camera.position.relative = new THREE.Vector3().copy( G.camera.position );

G.container     = document.getElementById('container' );


// Some Global Uniforms

G.dT      = { type:"f" , value: 0               } 
G.timer   = { type:"f" , value: 0               }
G.t_audio = { type:"t" , value: G.audio.texture }

G.paused  = false;


// Get all the fun stuff started

G.renderer.setSize( G.w , G.h );
G.container.appendChild( G.renderer.domElement );
  
G.stats.domElement.id = 'stats';
//document.body.appendChild( G.stats.domElement );

//G.leap.connect();
//G.gui.close();
G.scene.add( G.camera );
//G.onResize();

G.tween = TWEEN;

// Need something to call when started
G.startArray = [];

G.links     = [];
G.sections  = [];
G.balls     = [];

G.init = function(){

  /*
   
    Non Leap interaction

  */

  this.textCreator = new TextCreator( 40 );
  
  this.iPlane = new THREE.Mesh(
    new THREE.PlaneGeometry( 100000 , 100000 )
  );
  this.scene.add( this.iPlane );
  this.iPlane.visible = false;

  var l = 1000000000;

  this.iObj = new THREE.Object3D();
  this.iObj.position.set( l , l , -l*300 );

  this.iPointMarker = new THREE.Mesh(
    new THREE.BoxGeometry( 3, 3 , 100 ),
    new THREE.MeshBasicMaterial({color:0x9aae07})
  );

  //this.iObj.add( this.iPointMarker );
  this.scene.add( this.iObj );

  this.iPoint = this.iObj.position;
  this.iPoint.relative = new THREE.Vector3();
  this.iPoint.relative.copy( this.iPoint );

  this.iDir   = new THREE.Vector3( 0 , 0 , -1 );
  this.iPlaneDistance = 1000;

  /*

     For Mani

  */
  this.attractor = new THREE.Vector3();

  this.attracting = false;
  this.attractionTimer = 0;

  this.font = UbuntuMono( 'UbuntuMono.png'  );
 

 

  /*
  
     Text

  */

  /*this.text = new TextParticles({
    vertexShader:   this.shaders.vs.text,
    fragmentShader: this.shaders.fs.text,
    lineLength:     60,
    //letterWidth:    40,
    //lineHeight:     40
  });*/



  /*

     Object Controls for the entire book

  */

    
  this.objectControls = new ObjectControls( this.camera );

  this.mouse = this.objectControls.unprojectedMouse;
  this.raycaster = this.objectControls.raycaster;

}


G.updateIntersection = function(){

  
  this.iPlane.position.copy( this.camera.position );
  var vector = new THREE.Vector3( 0 , 0 , -this.iPlaneDistance );
  vector.applyQuaternion( this.camera.quaternion );
  this.iPlane.position.add( vector );
  this.iPlane.lookAt( this.camera.position );

  this.iObj.lookAt( this.camera.position );


  var dir = this.mouse.clone();

   dir.sub( this.camera.position );
  dir.normalize();

  
  this.raycaster.set( this.camera.position , dir);

  var intersects = this.raycaster.intersectObject( this.iPlane );

  if( this.objectControls.mouseMoved === true ){

    if( intersects.length > 0 ){
    
      this.iPoint.copy( intersects[0].point );
      this.iPoint.relative.copy( this.iPoint );
      this.iPoint.relative.sub( this.position );
      this.iDir = dir;
     // bait.position.copy( intersects[0].point );
    }else{
      //console.log('NOT HITTING IPLANE!');
    }


  }else{

    this.iPoint.set( 100000 , 100000 , 10000 );

  }

}

G.animate = function(){

  this.dT.value = this.clock.getDelta();  
  this.timer.value += G.dT.value;


  this.pageMarker.position.copy( this.position );
  
  if( !this.paused ){


    /*this.dT.value = this.clock.getDelta();
    this.timer.value += G.dT.value;*/

    this.tween.update();

   // if( this.objectControls.mouseMoved === true ){
      this.objectControls.update();
   // }
    this.updateIntersection();

    this.audio.update();

    this.camera.position.relative.copy( this.camera.position );
    this.camera.position.relative.sub( this.position );

    for( var i = 0; i < this.links.length; i++ ){

      this.links[i].update();

    }

    for( var i = 0; i < this.sections.length; i++ ){

      this.sections[i].update();

    }

    this.updateBalls();

      if( LOGO ){
        LOGO.update();
      }

      if( LINES ){

        LINES.geometry.verticesNeedUpdate = true;

      }
   // if( !G.mobile ){

      if( CONVEX && CONVEX_GEO && CONVEX_VERTEX_TO_BALL ){

        for( var i = 0; i < CONVEX_GEO.vertices.length; i++ ){
          CONVEX_GEO.vertices[i].copy( G.balls[ CONVEX_VERTEX_TO_BALL[i] ].position );
        }
        CONVEX_GEO.verticesNeedUpdate = true;
        CONVEX_GEO.computeFaceNormals();

      }
   
   // }
    this.updateScroll();


  }

  this.stats.update();
  this.renderer.render( this.scene , this.camera );
  requestAnimationFrame( this.animate.bind( this ) );

}


G.addToStartArray = function( callback ){

  this.startArray.push( callback );

}


G.onResize = function(){
  G.windowSize.x = window.innerWidth;
  G.windowSize.y = window.innerHeight;

  this.w = window.innerWidth;
  this.h = window.innerHeight;
  this.ratio = this.w / this.h
 
  this.camera.aspect = this.ratio;
  this.camera.fov   = 60 / Math.pow(this.ratio,.7); //* this.ratio;
  this.camera.updateProjectionMatrix();
  this.renderer.setSize( this.w , this.h );

}

G.onKeyDown = function( e ){

  //console.log( e.which );
  if( e.which == 32 ){

    this.paused = !this.paused;

  }


}

G.loadTextures = function(){

  for( var i = 0; i < G.texturesToLoad.length; i++ ){

    var t = G.texturesToLoad[i];

    this.loadTexture( t[0] , t[1] );

  }

}

G.loadTexture = function( name , file ){

  var cb = function(){
    this.loader.onLoad(); 
  }.bind( this );

  var m = THREE.UVMapping;

  var l = THREE.ImageUtils.loadTexture;

  G.loader.addLoad();
  G.TEXTURES[ name ] = l( file , m , cb );
  G.TEXTURES[ name ].wrapS = THREE.RepeatWrapping;
  G.TEXTURES[ name ].wrapT = THREE.RepeatWrapping;

}

G.updateBalls = function(){

  if( !BALL_ORIGINS || !BALL_ORIGINS.length ) return;

  var angle = this.scrollPos * 0.001;
  var cosA  = Math.cos( angle );
  var sinA  = Math.sin( angle );

  for( var i = 0; i < this.balls.length; i++ ){

    var b    = this.balls[i];
    var orig = BALL_ORIGINS[i];

    // Rotate origin around X axis by scroll angle to get target
    var tx = orig.x;
    var ty = orig.y * cosA - orig.z * sinA;
    var tz = orig.y * sinA + orig.z * cosA;

    // Spring toward target
    b.velocity.x += ( tx - b.position.x ) * 0.05;
    b.velocity.y += ( ty - b.position.y ) * 0.05;
    b.velocity.z += ( tz - b.position.z ) * 0.05;

    if( !b.hovered ){
      b.position.add( b.velocity );
      b.velocity.multiplyScalar( 0.85 );
    }

    b.mesh.lookAt( this.camera.position );

  }

}
//G.createNextPage

// Some Event Listeners

window.addEventListener( 'resize'   , G.onResize.bind( G )  , false );
window.addEventListener( 'keydown'  , G.onKeyDown.bind( G ) , false );

