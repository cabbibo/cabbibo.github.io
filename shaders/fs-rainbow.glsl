
uniform sampler2D t_matcap;
uniform float scrollPos;
uniform sampler2D t_audio;
uniform float hoverState;
varying vec2 vSEM;
varying vec3 vEye;
varying vec3 vNorm;
varying float vFR;
varying vec3 vPos;
varying vec3 vColor;
$simplex

void main(){

  if( hoverState > 0.5 ){
    gl_FragColor = vec4( 1.0, 1.0, 1.0, 1.0 );
    return;
  }

  vec4 sem = texture2D( t_matcap , vSEM );

  vec4 nCol =  vec4( vNorm * .5 + .7 , 1. );

  vec4 color = nCol;
  gl_FragColor =sem* vec4(color.xyz ,1.);

}

