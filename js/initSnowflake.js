function initSnowflake(){
  var PARAMS = {

      guide:{
        
        lengthRandomness: .5,
        lengthMultiplier: .5,
        heightRandomness: .5,
        heightMultiplier: .5,
        widthRandomness: .5,
        widthMultiplier: .5,
        branchLateness: 0,//1.8,
        branches: 2,
        maxDepth: 6,
        branchChance: .6,
        minChildren: 10,
        maxChildren: 20,
        length: 1.,
        width: 1.,
        height: .1,
        position: 0,

      },

      guideRanges:{

        lengthRandomness: [ 0  , 1  ],
        lengthMultiplier: [ 0  , 1  ],
        heightRandomness: [ 0  , 1  ],
        heightMultiplier: [ 0  , 1  ],
        widthRandomness:  [ 0  , 1  ],
        widthMultiplier:  [ 0  , 1  ],
        branchLateness:   [ 0  , 1  ],//1.8,
        branches:         [ 1  , 20 ],
        maxDepth:         [ 1  , 10 ],
        branchChance:     [ 0  , 1  ],
        minChildren:      [ 1  , 10 ],
        maxChildren:      [ 11 , 30 ],
        length:           [ .1 , 2 ],
        width:            [ .1 , 2 ],
        height:           [ .1 , .2 ],
        position:         [  0 , 1 ]

      },

      branch:{

        length: 50,
        width:  40,
        height: 100,
        extraH:.5, 
        vDepth: .2,

        lengthRandomness: .00001,
        widthRandomness: .0001,
        heightRandomness: .0001,
        angleRange:.01
        
      },

      branchRanges:{

        length: [ 20 , 100 ],
        width:  [ 10 , 60 ],
        height: [ 5 , 50  ],
        extraH: [ 0 , .5 ], 
        vDepth: [ 0 , .5 ],

        lengthRandomness: [ 0.00001 , .1 ],
        widthRandomness: [ 0.00001 , .1 ],
        heightRandomness: [ 0.00001 , .1 ],
        angleRange:[ 0.00001 , .1 ],        
      },

      randomSnowflake: function(){ nextSnowflake( true ); },
      nextSnowflake: function(){ nextSnowflake(); },

    }


  var uniforms = {
      t_matcap:{type:"t" , value:G.TEXTURES['matcap']},
      filled:{type:"f" , value:0}
    }


   var attributes = {
      normal:{type:"v3" , value:null },
      fade: { type:"f" , value:null },
      edge: { type:"f" , value:null },
      id: { type:"f" , value:null }
    }
    var vs = G.shaders.vs.snow;
    var fs = G.shaders.fs.snow;

    snowflakeMaterial = new THREE.ShaderMaterial({

      attributes: attributes,
      uniforms:   uniforms,
      vertexShader: vs,
      fragmentShader: fs,
      transparent: true,

    });

    function createSnowflake(){

      var geometry = new SnowflakeGeometry(
        PARAMS.guide,
        PARAMS.branch
      );

      snowflake = new THREE.Mesh( geometry , snowflakeMaterial );
     // scene.add( snowflake );

      var i = { v: 0 };
      var f = { v: PARAMS.guide.maxDepth * 2 }

      var t = new TWEEN.Tween( i ).to( f , (PARAMS.guide.maxDepth * 2 ) * 200 );

      t.onUpdate( function(){
        uniforms.filled.value = i.v;
      });

      t.onComplete( function(){

        //snowflakeFinished();

      });

      t.start();

      return snowflake

    }

    return createSnowflake();


}
