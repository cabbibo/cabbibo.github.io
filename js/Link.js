
function Link( id , params ){

  this.id = id;
  this.params = params;
  this.started = false;

  this.text = new PhysicsText( this.params.text );
  this.text.kill();

  this.active = false;
  this.dead   = true;

  if( this.params.name === 'TITLE' ){

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry( 40 , 40 ),
      new THREE.MeshBasicMaterial({
        map: G.TEXTURES['cabbibo']
      })
    );

  }else if( this.params.name === 'FACEBOOK' ){

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry( 30 , 30 ),
      new THREE.MeshBasicMaterial({
        map: G.TEXTURES['facebook']
      })
    );

  }else if( this.params.name === 'TWITTER' ){

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry( 30 , 30 ),
      new THREE.MeshBasicMaterial({
        map: G.TEXTURES['twitter']
      })
    );

  }else if( this.params.name === 'SOUNDCLOUD' ){

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry( 30 , 30 ),
      new THREE.MeshBasicMaterial({
        map: G.TEXTURES['soundcloud']
      })
    );

  }else{
  
    this.mesh = G.textCreator.createMesh( this.params.name );

  }

  this.mesh.hoverOver = this.hoverOver.bind( this );
  this.mesh.hoverOut  = this.hoverOut.bind( this );
  this.mesh.select    = this.select.bind( this );
  this.mesh.deselect  = this.deselect.bind( this );

  this.mesh.material.opacity = 1;
  this.mesh.material.transparent = true;
  this.mesh.material.blending = THREE.AdditiveBlending;
  this.mesh.material.depthWrite = false;
  this.mesh.materialNeedsUpdate = true;

  this.neutralColor = new THREE.Color( 0x444444 );
  this.focusColor   = new THREE.Color( 0xbbbbbb );
  this.hoveredColor = new THREE.Color( 0xffffff );

  G.objectControls.add( this.mesh );

}

Link.prototype.focus = function(){}
Link.prototype.unFocus = function(){}

Link.prototype.activate = function(){

  if( this.started === false ){

    this.text.activate();
    this.started = true;
  }

  if( this.deathTweening ){

    this.deathTween.stop();
    this.deathTweening = false;
    this.deathTween = undefined;
    this.text.live();
    this.tweenIn();
    //this.mesh.material.color = this.activeColor;
    
  }


  if( this.dead == true ){

   // var t = ParticleUtils.createPositionsTexture( this.text.size , G.links[0].mesh );
   // this.text.physics.reset( t );
    this.text.live();
    this.tweenIn();
    //this.mesh.material.color = this.activeColor;
    

  }

  if( this.active ){

    console.log( 'already active' );

  }

  if( !this.dead ){

    //this.mesh.material.color = this.superColor;

  }

}

Link.prototype.deactivate = function(){


  this.mesh.material.color = this.neutralColor

  if( this.lifeTweening ){

    this.lifeTween.stop();
    this.lifeTweening = false;
    this.lifeTween = undefined;
    this.text.kill();
    this.tweenOut();

      //this.mesh.material.color = this.unactiveColor;


  }

  if( this.active ){

    this.text.kill();
    this.tweenOut();

    //this.mesh.material.color = this.unactiveColor;


  }
  

}

Link.prototype.tweenIn = function(){

  this.dead = false;

  var v = this.text.uniforms.opacity.value
  var s = {
    
    o : v, 
    


  };
 
  var e = {
    o : 1,


  
  };
    
  this.lifeTween = new G.tween.Tween( s ).to( e , 1000 );

  this.lifeTweening = true;
  s.link = this;
  
  s.random = [];
  
  this.lifeTween.onUpdate( function(t){

    this.link.text.uniforms.opacity.value = this.o;

  });

  this.lifeTween.onComplete( function(){

    this.link.lifeTweening = false;
    this.link.lifeTween = undefined;

    this.link.active = true;

  });

  this.lifeTween.start();


}


Link.prototype.tweenOut = function(){
 
  this.active = false;

  var v = this.text.uniforms.opacity.value

   var s = {
    
    o : v, 
    
  };
 
  var e = {
    
    o : 0,

  
  };


  this.deathTween = new G.tween.Tween( s ).to( e , 3000 );
  this.deathTweening = true;
 
  s.link = this;

  this.deathTween.onUpdate( function(){

    this.link.text.uniforms.opacity.value = this.o * this.o*this.o*this.o*this.o;


  });

  this.deathTween.onComplete( function(){

    this.link.deathTweening = false;

    this.link.dead = true;

    this.link.deathTween = undefined;

  });

  this.deathTween.start();

}

Link.prototype.update = function(){

  if( !this.dead ){
    this.text.update();
  }


}

Link.prototype.hoverOver = function(){


  console.log( this.params.name );
  G.AUDIO[ this.params.note ].play();
  this.mesh.material.color = this.hoveredColor;

  G.hoverOver( this.id );

}

Link.prototype.hoverOut = function(){

  if( !this.dead ){

    this.mesh.material.color = this.focusColor;


  }else{

    this.mesh.material.color = this.neutralColor;

  }
  G.hoverOut( this.id );
}

Link.prototype.select = function(){
  if( this.params.link ){
    window.location = this.params.link
  }
  G.select( this.id );
}


Link.prototype.deselect = function(){ 
  G.deselect( this.id );
}

Link.prototype.instant = function(){



}

