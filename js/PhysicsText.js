function PhysicsText( string , params ){

  this.string = string;
  this.params = _.defaults( params || {} , {

    sim: G.shaders.ss.text,

    repelPositions: [],
    gRepelPositions: [],
    offset: new THREE.Vector3( -360 , 130 , 0 ),
    distToCam: 1000,
    repelForce: 200000

  });

  this.sim = this.params.sim;
  this.particles = G.text.createTextParticles( this.string );

  this.uniforms = this.particles.material.uniforms;

  this.size = this.particles.size;


  this.physics = new PhysicsRenderer( this.size , this.sim , G.renderer );

  this.physics.setUniform( 't_to' , {
    type:"t",
    value:this.uniforms.t_lookup.value
  });


  var repelPos = [];

  for( var i = 0; i< this.params.repelPositions.length; i++ ){

    repelPos.push( this.params.repelPositions[i] );

  }

  for( var i = repelPos.length; i < 20; i++ ){

    var l = 1000000000;
    repelPos.push( new THREE.Vector3( l , l , l )); 

  }

  var uRepelPos = {
    type:"v3v",
    value: repelPos
  }

  var gRepelPos = [];

  gRepelPos.push( G.rHand.hand.position );
  gRepelPos.push( G.lHand.hand.position );
  gRepelPos.push( G.iPoint );

  //TODO: add something cool for this
  //gRepelPos.push( new THREE.Vector3( 10000000000000 , 0 , 0 ) );
  gRepelPos.push( new THREE.Vector3( 10000000000000 , 0 , 0 ) );

  var uGRepelPos = {
    type:"v3v",
    value: gRepelPos
  }

  //console.log('UG');
  //console.log( uGRepelPos );
  //console.log( uRepelPos );


  var speedUniform  = { type:"v3" , value:new THREE.Vector3() }
  var cameraMat     = { type:"m4" , value:G.camera.matrixWorld}
  var cameraPos     = { type:"v3" , value:G.camera.position } 

  this.offsetPos     = { type:"v3" , value: this.params.offset }
  this.alive         = { type:"f"  , value:0}

  this.distToCam     = { type:"f"  , value: this.params.distToCam } 
  this.repelForce    = { type:"f"  , value: this.params.repelForce }
  this.pagePos       = { type:"v3" , value: G.position }

  var noiseSize = .002 + (Math.random() -.5)*.003;

  this.noiseSize     = { type:"f"  , value: noiseSize };

  this.physics.setUniform( 'speed'       , speedUniform      );
  this.physics.setUniform( 'timer'       , G.timer           );
  this.physics.setUniform( 'cameraMat'   , cameraMat         );
  this.physics.setUniform( 'cameraPos'   , cameraPos         );
  this.physics.setUniform( 'repelPos'    , uRepelPos         );
  this.physics.setUniform( 'gRepelPos'   , uGRepelPos        );
  this.physics.setUniform( 'pagePos'     , this.pagePos      );
  this.physics.setUniform( 'alive'       , this.alive        );
  this.physics.setUniform( 'offsetPos'   , this.offsetPos    );
  this.physics.setUniform( 'distToCam'   , this.distToCam    );
  this.physics.setUniform( 'repelForce'  , this.repelForce   );
  this.physics.setUniform( 'noiseSize'   , this.noiseSize    );

  this.physics.addBoundTexture( this.particles , 't_lookup' , 'output' );


}

PhysicsText.prototype.kill = function(){

  this.alive.value = 0;

}

PhysicsText.prototype.live = function(){

  this.alive.value = 1;

}


PhysicsText.prototype.instant = function(){

  this.alive.value = 2;


  this.physics.update();
  this.physics.update();
  this.physics.update();

  this.alive.value = 1;

}

PhysicsText.prototype.activate = function(){

  this.live();
  G.scene.add( this.particles );

}

PhysicsText.prototype.deactivate = function(){

  G.scene.remove( this.particles );

}

PhysicsText.prototype.update = function(){

  this.physics.update();


}
