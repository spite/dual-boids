const shader = `
precision highp float;

#define SPHERES 200

attribute vec3 position;
attribute vec3 normal;

varying vec3 vPosition;
varying float occlusion;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform vec3 positions[ SPHERES ];
uniform float scales[ SPHERES ];

uniform float theme;

void main() {

	vPosition = ( modelMatrix * vec4( position, 1. ) ).xyz;
	gl_Position = projectionMatrix *  modelViewMatrix * vec4( position, 1. );

	vec3 on = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );

	occlusion = 0.;

	float l;
	float t;

	for( int i = 0; i < SPHERES; i++ ) {

		vec3 dir = positions[ i ] - vPosition;
		float l = dir.x * dir.x + dir.y * dir.y + dir.z * dir.z;
		float t = 1. - max( 0., dot( on, dir / sqrt( l ) ) ) * scales[ i ] / l;
		
		occlusion += t;
	}

	occlusion /= float( SPHERES ); 

  if(theme == 0.) {
    // light
    occlusion *= 4.;
    occlusion -= 3.;
    occlusion = clamp( occlusion, 0., 1. );	
  } else {
    // dark
    occlusion = clamp( occlusion, 0., 1. );	
    occlusion = 1.-occlusion;
    occlusion *= 20.;
    occlusion += .25;
  }
}`;

export { shader };
