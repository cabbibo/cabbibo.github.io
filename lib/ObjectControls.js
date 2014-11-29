
  // TODO Make it so you can pass in renderer w / h
  function ObjectControls( eye , params ){

    this.intersected;
    this.selected;

    this.eye          = eye;

    this.mouse            = new THREE.Vector3(  -1,  -0.9029649595687332, 1);
    this.unprojectedMouse = new THREE.Vector3();//1000000 , 10000 , 1000);
    
    this.objects      = [];

    var params = params || {};

    var indicator = new THREE.Mesh( 
      new THREE.IcosahedronGeometry( 10 , 2 ),
      new THREE.MeshBasicMaterial({ color:0x0000ff })
    );

    this.domElement         = params.domElement         || document//////////////////.body;
    this.selectionStrength  = params.selectionStrength  || .5;
    this.indicator          = params.indicator          || indicator; 

    this.neutralColor       = params.neutralColor       || new THREE.Color( .5 , .5 , .5 );
    this.hoverColor         = params.hoverColor         || new THREE.Color( 1 , .6 , 0 );
    this.downColor          = params.downColor          || new THREE.Color( 1 , 0 , 0 );
    this.selectColor        = params.selectColor        || new THREE.Color( 0 , 1 , 0 );

    
    // The ways the we call up down, 
    // and update selected
    this.upDownEvent        = params.upDownEvent        || this.pinchEvent
    this.selectedUpdate     = params.selectedUpdate     || function(){}      
    
    this.raycaster          = new THREE.Raycaster();
    this.projector          = new THREE.Projector();
    

    this.raycaster.near     = this.eye.near;
    this.raycaster.far      = this.eye.far;


    var addListener = this.domElement.addEventListener;
  
    var cb1 = this.mouseDown.bind( this );
    var cb2 = this.mouseUp.bind( this );
    var cb3 = this.mouseMove.bind( this );

    this.domElement.addEventListener( 'mousedown', cb1 , false )
    this.domElement.addEventListener( 'mouseup'  , cb2  , false )
    this.domElement.addEventListener( 'mousemove', cb3  , false )

    this.domElement.addEventListener( 'touchdown', cb1 , false )
    this.domElement.addEventListener( 'touchup'  , cb2  , false )
    this.domElement.addEventListener( 'touchmove', cb3  , false )
   
    this.unprojectMouse();

  }

  /*

     EVENTS

  */

  

  // You can think of _up and _down as mouseup and mouse down

  ObjectControls.prototype._down = function(){

    this.down();
    this.indicator.material.color = this.downColor;

    if( this.intersected ){
     
      //console.log( this.intersected );
      this._select( this.intersected  );

    }

  }

  ObjectControls.prototype.down = function(){}



  ObjectControls.prototype._up = function(){

    this.up();

    this.indicator.material.color = this.neutralColor;
      
    if( this.selected ){

      this._deselect( this.selected );

    }

  }

  ObjectControls.prototype.up = function(){}



  ObjectControls.prototype._hoverOut =  function( object ){

    this.hoverOut();
    
    this.objectHovered = false;
    
    this.indicator.material.color = this.neutralColor;
    
    if( object.hoverOut ){
      object.hoverOut( this );
    }
  
  };

  ObjectControls.prototype.hoverOut = function(){};



  ObjectControls.prototype._hoverOver = function( object ){
   
    this.hoverOver();
    
    this.objectHovered = true;
    
    this.indicator.material.color = this.hoverColor;

    if( object.hoverOver ){
      object.hoverOver( this );
    }
  
  };

  ObjectControls.prototype.hoverOver = function(){}



  ObjectControls.prototype._select = function( object ){
   
    this.select();
                
    this.indicator.material.color = this.selectColor;
    
    var intersectionPoint = this.getIntersectionPoint( this.intersected );

    this.selected       = object;
    this.intersectionPoint = intersectionPoint;
   
    if( object.select ){
      object.select( this );
    }

  };

  ObjectControls.prototype.select = function(){}


  
  ObjectControls.prototype._deselect = function( object ){
    
    //console.log('DESELECT');

    this.selected = undefined;
    this.intersectionPoint = undefined;

    if( object.deselect ){
      object.deselect( this );
    }

    this.deselect();

  };

  ObjectControls.prototype.deselect = function(){}





  /*

     Visual feedback

  */

  ObjectControls.prototype.linkToHand = function( object ){
   
    this.hand.add( object );

  };

  
  ObjectControls.prototype.addIndicator = function(){

    this.hand.add( this.indicator );
  
  };




  /*
  
    Changing what objects we are controlling 

  */

  ObjectControls.prototype.add = function( object ){

    this.objects.push( object );

  };

  ObjectControls.prototype.remove = function( object ){

    for( var i = 0; i < this.objects.length; i++ ){

      if( this.objects[i] == object ){
    
        this.objects.splice( i , 1 );

      }

    }

  };


  
  
  /*

     Update Loop

  */

  ObjectControls.prototype.update = function(){

    if( !this.selected ){

      this.checkForIntersections( this.unprojectedMouse );

    }else{

      this._updateSelected( this.unprojectedMouse );

    }

  };

  ObjectControls.prototype._updateSelected = function(){

    this.selectedUpdate();

    if( this.selected.update ){

      this.selected.update( this );

    }

  }
  
  ObjectControls.prototype.updateSelected = function(){};
  
  /*
   
    Checks 

  */

  ObjectControls.prototype.checkForIntersections = function( position ){

    var origin    = position;
    var direction = origin.clone()
  
    direction.sub( this.eye.position );
    direction.normalize();

    this.raycaster.set( this.eye.position , direction );
    var intersected =  this.raycaster.intersectObjects( this.objects );

    if( intersected.length > 0 ){

      this._objectIntersected( intersected );

    }else{

      this._noObjectIntersected();

    }

  };

  ObjectControls.prototype.checkForUpDown = function( hand , oHand ){

    if( this.upDownEvent( this.selectionStrength , hand , oHand ) === true ){
    
      this._down();
    
    }else if( this.upDownEvent( this.selectionStrength , hand , oHand ) === false ){
    
      this._up();
    
    }
  
  };




  ObjectControls.prototype.getIntersectionPoint = function( i ){

    var intersected =  this.raycaster.intersectObjects( this.objects );
   
    return intersected[0].point.sub( i.position );

  }


  /*
   
     Raycast Events

  */

  ObjectControls.prototype._objectIntersected = function( intersected ){

    // Assigning out first intersected object
    // so we don't get changes everytime we hit 
    // a new face
    var firstIntersection = intersected[0].object;

    if( !this.intersected ){

      this.intersected = firstIntersection;

      this._hoverOver( this.intersected );


    }else{

      if( this.intersected != firstIntersection ){

        this._hoverOut( this.intersected );

        this.intersected = firstIntersection;

        this._hoverOver( this.intersected );

      }

    }

    this.objectIntersected();

  };

  ObjectControls.prototype.objectIntersected = function(){}

  ObjectControls.prototype._noObjectIntersected = function(){

    if( this.intersected  ){

      this._hoverOut( this.intersected );
      this.intersected = undefined;

    }

    this.noObjectIntersected();

  };

  ObjectControls.prototype.noObjectIntersected = function(){}


  ObjectControls.prototype.mouseMove = function(event){

    this.mouseMoved = true;

    this.mouse.x =  ( event.clientX / window.innerWidth )  * 2 - 1;
    this.mouse.y = -( event.clientY / window.innerHeight ) * 2 + 1;
    this.mouse.z = 1;

    this.unprojectMouse();

  }

  ObjectControls.prototype.unprojectMouse = function(){

    this.unprojectedMouse.copy( this.mouse );
    this.projector.unprojectVector( this.unprojectedMouse , this.eye );

  }

  ObjectControls.prototype.mouseDown = function( event ){
    this.mouseMove( event );
    this._down();
  }

  ObjectControls.prototype.mouseUp = function(){
    this.mouseMove( event );
    this._up();
  }


  ObjectControls.prototype.touchStart = function(event){
  

    //alert( event.touches[0].pageX );

    this.touchMove( event );
    this._down();
  }

  ObjectControls.prototype.touchEnd = function(event){
    this.touchMove( event );
    this._up();
  }

  ObjectControls.prototype.touchMove= function(event){
       
    this.mouseMoved = true;

    this.mouse.x =  (  event.touches[ 0 ].pageX / window.innerWidth )  * 2 - 1;
    this.mouse.y = -(  event.touches[ 0 ].pageY / window.innerHeight ) * 2 + 1;
    this.mouse.z = 1;

    this.unprojectMouse();
    
  }

 


