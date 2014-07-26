function Link( id , params ){

  this.id = id;

  this.params = params;

  this.text = new PhysicsText( this.params.text );
  this.text.kill();

  this.active = false;
  this.dead   = true;

  this.mesh = G.textCreator.createMesh( this.params.name );

  this.mesh.hoverOver = this.hoverOver.bind( this );
  this.mesh.hoverOut  = this.hoverOut.bind( this );
  this.mesh.select    = this.select.bind( this );
  this.mesh.deselect  = this.deselect.bind( this );

  this.mesh.material.opacity = .5;
  this.mesh.material.transparent = true;
  this.mesh.material.blending = THREE.AdditiveBlending;
  this.mesh.material.depthwrite = false;
  this.mesh.materialNeedsUpdate = true;

  this.activeColor  = new THREE.Color( 0x00ccaa );
  this.unactiveColor = new THREE.Color( 0xff5500 );

  G.objectControls.add( this.mesh );

}

Link.prototype.focus = function(){}
Link.prototype.unFocus = function(){}

Link.prototype.activate = function(){

  this.active = true;
  this.mesh.material.color = this.activeColor;



}

Link.prototype.deactivate = function(){
  

  this.mesh.material.color = this.unactiveColor;


  if( this.lifeTweening ){
    
    this.lifeTween.stop();
    this.lifeTweening = false;
    this.lifeTween = undefined;
    this.text.kill();
    this.tweenOut();

  }
       

  if( this.active ){

    this.active = false;
    this.text.kill();
    this.tweenOut();

  }
  

}

Link.prototype.tweenIn = function(){

  var v = this.text.uniforms.opacity.value
  var s = { o : v };
  var e = { o : 1 };
    
  this.lifeTween = new G.tween.Tween( s ).to( e , 1000 );

  this.lifeTweening = true;
  s.link = this;
  
  this.lifeTween.onUpdate( function(){

    this.link.text.uniforms.opacity.value = this.o;

  });

  this.lifeTween.onComplete( function(){

    this.lifeTweening = false;
    this.lifeTween = undefined;

  });

  this.lifeTween.start();


}


Link.prototype.tweenOut = function(){
  
  var v = this.text.uniforms.opacity.value
  var s = { o : v };
  var e = { o : 0 };

  this.deathTween = new G.tween.Tween( s ).to( e , 3000 );
  this.deathTweeing = true;
 
  s.link = this;

  this.deathTween.onUpdate( function(){

    this.link.text.uniforms.opacity.value = this.o;

  });

  this.deathTween.onComplete( function(){

    this.deathTweening = false;

    this.dead = true;

    this.link.active = false;
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
  G.hoverOver( this.id );
}

Link.prototype.hoverOut = function(){
  G.hoverOut( this.id );
}

Link.prototype.select = function(){
  G.select( this.id );
}


Link.prototype.deselect = function(){ 
  G.deselect( this.id );
}



