const shader = `
precision highp float;

varying float occlusion;

float random(vec3 scale,float seed){return fract(sin(dot(gl_FragCoord.xyz+seed,scale))*43758.5453+seed);}

void main(){

	vec3 color = vec3( occlusion );
	gl_FragColor = vec4( color, 1. );
  // gl_FragColor = vec4(1.,0.,1.,1.);
}
`;

export { shader };
