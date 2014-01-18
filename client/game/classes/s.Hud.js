s.HUD = new Class({
	toString: "HUD",

	construct: function( options ){

		this.game = options.game;
		this.controls = options.controls;

        this.PI = Math.PI;

		this.canvas = document.createElement('canvas');

		this.canvas.height = window.innerHeight;
		this.canvas.width = window.innerWidth;

		this.canvas.style.position = 'absolute';
		this.canvas.style.top = '0';
		this.canvas.style.left = '0';

		this.ctx = this.canvas.getContext('2d');

		this.gameOver = new Image();
        this.gameOver.src = 'game/textures/Game-Over-1.png';

		this.targetX = 0;
		this.targetY = 0;

		this.subreticleBound = {};

		this.update = this.update.bind(this);
		this.game.hook(this.update);
		//document.body.appendChild(this.canvas);
        this.menu = new s.Color({
            game: this.game,
            red: 0,
            green: 255,
            blue: 0,
            alpha: 0.5
        });
        this.hit = new s.Color({
            game: this.game,
            red: 255,
            green: 255,
            blue: 255,
            alpha: 1
        });
        this.hull = new s.Color({
            game: this.game,
            red: 255,
            green: 0,
            blue: 0,
            alpha: 1
        });
        this.shields = new s.Color({
            game: this.game,
            red: 0,
            green: 200,
            blue: 255,
            alpha: 0.5
        });
        this.shieldsFull = new s.Color({
            game: this.game,
            red: 0,
            green: 200,
            blue: 255,
            alpha: 0
        });
        this.shieldsDamaged = new s.Color({
            game: this.game,
            red: 0,
            green: 200,
            blue: 255,
            alpha: 0.75
        });

        // array containing trailing predictive targets
        this.trailingPredictions = [];

        // changeTarget modified by key commands to cycle through targets; currentTarget represents index of targeted enemy
        this.changeTarget = 0;
        this.currentTarget = 0;

	},
	update: function(){

        ////////////////////////
        // TURNING SUBRETICLE //
        ////////////////////////

        var velocity = this.controls.options.thrustImpulse,
            height = window.innerHeight,
            width = window.innerWidth,
            centerX = width/2,
            centerY = height/2;

        if (this.canvas.height !== height){
            this.canvas.height = height;
        }
        if (this.canvas.width !== width){
            this.canvas.width = width;
        }
        this.ctx.clearRect(0, 0, width, height);

        // Vector for cursor location centered around the center of the screen
        this.cursorVector = new THREE.Vector2(this.targetX - centerX, this.targetY - centerY);

		var borderWidth = width/8;
		var borderHeight = height/8;

        this.hp = this.game.player.hull;
        this.health = width * (this.hp/s.config.ship.hull + 0.5);

        this.ctx.fillStyle = this.menu.color;

        this.subreticleBound.radius = Math.min(width/8,height/4);
        this.ctx.beginPath();
        this.ctx.arc( centerX, centerY, this.subreticleBound.radius, 0, 2*this.PI, false);
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.menu.color;
        this.ctx.stroke();


        if (this.cursorVector.length() > this.subreticleBound.radius) {
            this.cursorVector.normalize().multiplyScalar(this.subreticleBound.radius);
            this.targetX = this.cursorVector.x+centerX;
            this.targetY = this.cursorVector.y+centerY;
        }

        this.ctx.fillStyle = this.menu.color;
        this.ctx.strokeStyle = this.menu.color;


        ///////////////////
        // BEZIER CURVES //
        ///////////////////

        var throttleStartX = centerX - this.subreticleBound.radius;
        var throttleStartY = centerY - height/4;

        var throttleCP1X = throttleStartX - this.subreticleBound.radius/2;
        var throttleCP1Y = throttleStartY + height/12;

        var throttleCP2X = throttleCP1X;
        var throttleCP2Y =  centerY + height/4 - height/12;

        var throttleEndX = throttleStartX;
        var throttleEndY = centerY + height/4;

        var throttle2CP1X = throttleCP2X - width/50;
        var throttle2CP1Y = throttleCP2Y;

        var throttle2CP2X = throttle2CP1X;
        var throttle2CP2Y =  throttleCP1Y;

        var throttle2EndX = throttleStartX;
        var throttle2EndY = throttleStartY;

        this.ctx.beginPath( );
        this.ctx.moveTo(throttleStartX,throttleStartY);

        this.ctx.bezierCurveTo(
            throttleCP1X,
            throttleCP1Y,
            throttleCP2X,
            throttleCP2Y,
            throttleEndX,
            throttleEndY
        );

        this.ctx.bezierCurveTo(
            throttle2CP1X,
            throttle2CP1Y,
            throttle2CP2X,
            throttle2CP2Y,
            throttle2EndX,
            throttle2EndY
        );

        this.ctx.closePath();

        grd = this.ctx.createLinearGradient(0, throttleEndY, 0, throttleEndY - (throttleStartY * (velocity * 2/s.config.ship.maxSpeed)) - 4);
        grd.addColorStop(0, this.menu.color);
        grd.addColorStop(0.99, this.menu.color);
        grd.addColorStop(1, ("rgba(0,0,0,0)"));

        this.ctx.fillStyle = grd;

        this.ctx.fill();

        this.ctx.stroke();

        this.ctx.font="15px Futura";
        this.ctx.fillText("Throttle",throttleStartX,throttleEndY + 30);

        this.ctx.strokeStyle = this.menu.color;

        throttleStartX = centerX + this.subreticleBound.radius;
        throttleStartY = centerY - height/4;

        throttleCP1X = throttleStartX + this.subreticleBound.radius/2;
        throttleCP1Y = throttleStartY + height/12;

        throttleCP2X = throttleCP1X;
        throttleCP2Y =  centerY + height/4 - height/14;

        throttleEndX = throttleStartX;
        throttleEndY = centerY + height/4;

        throttle2CP1X = throttleCP2X + this.canvas.width/50;
        throttle2CP1Y = throttleCP2Y;

        throttle2CP2X = throttle2CP1X;
        throttle2CP2Y =  throttleCP1Y;

        throttle2EndX = throttleStartX;
        throttle2EndY = throttleStartY;

        this.ctx.beginPath( );
        this.ctx.moveTo(throttleStartX,throttleStartY);

        this.ctx.bezierCurveTo(
            throttleCP1X,
            throttleCP1Y,
            throttleCP2X,
            throttleCP2Y,
            throttleEndX,
            throttleEndY
        );

        this.ctx.bezierCurveTo(
            throttle2CP1X,
            throttle2CP1Y,
            throttle2CP2X,
            throttle2CP2Y,
            throttle2EndX,
            throttle2EndY
        );

        this.ctx.closePath();

        grd = this.ctx.createLinearGradient(0, throttleEndY, 0, throttleEndY - (throttleStartY * (this.game.player.shields * 2/s.config.ship.shields)) - 5);
        grd.addColorStop(0, this.shields.color);
        grd.addColorStop(0.99, this.shields.color);
        grd.addColorStop(1, ("rgba(0,0,0,0)"));

        this.ctx.fillStyle = grd;
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.fillText("Shields",throttleEndX - 45,throttleEndY + 30);
        this.ctx.beginPath();
        this.ctx.fillStyle = this.menu.color;
        this.ctx.arc(this.targetX, this.targetY, 5, 0, 2 * this.PI, false);
        this.ctx.fill();


        /////////////////////////////////////
        // CURRENT NUMBER OF USERS IN GAME //
        /////////////////////////////////////

        var enemies = s.game.enemies.list();
        var enemiesLen = enemies.length;

        this.ctx.fillText("Survivors: " + (enemiesLen + 1), width-128-36, 256+30 );
        this.ctx.fill();


        ///////////////////////////
        // MOON TARGETING SYSTEM //
        ///////////////////////////

        this.moon = s.game.moon.root;

        var vMoon3D = this.moon.position.clone();
        var vMoon2D = s.projector.projectVector( vMoon3D, s.game.camera );
        var moonInSight = !!( Math.abs(vMoon2D.x) <= 0.95 && Math.abs(vMoon2D.y) <= 0.95 && vMoon2D.z < 1 );

        // Moon targeting reticule
        if ( !moonInSight ) {

            var moon2D = new THREE.Vector2(vMoon2D.x, vMoon2D.y);
            moon2D.multiplyScalar(1/moon2D.length()).multiplyScalar(this.subreticleBound.radius+34);

            this.ctx.beginPath();
            if (vMoon2D.z > 1)
                this.ctx.arc( -moon2D.x+centerX, (-moon2D.y+centerY), 10, 0, 2*this.PI, false );
            else
                this.ctx.arc( moon2D.x+centerX, -(moon2D.y-centerY), 10, 0, 2*this.PI, false );

            this.ctx.fillStyle = "black";
            this.ctx.fill();
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = this.menu.color;
            this.ctx.stroke();
        }


        //////////////////////////////////////////
        // ENEMY TARGETING AND CALLSIGN DISPLAY //
        /////////////////////////////////////////

        var self = s.game.player.root;

        if (enemies) {

            // changeTarget changes current tracked enemy in the enemy array by +/- 1
            var i = this.currentTarget + this.changeTarget;

            // cycle i through the list of enemies
            i = ( i === -1 ? enemiesLen-1 : i > enemiesLen-1 ? 0 : i );
            this.currentTarget = i;
            this.changeTarget = 0;

            this.target = enemies[i];
            var targetInSight = false;

            for (var j = 0; j < enemiesLen; j++) {

                this.callTarget = enemies[j].root;

                var call3D = this.callTarget.position.clone();
                var call2D = s.projector.projectVector(call3D, s.game.camera);

                var distanceToCallTarget, c2D, callSize, callTargetInSight;

                if ( Math.abs(call2D.x) <= 0.95 && Math.abs(call2D.y) <= 0.95 && call2D.z < 1 ){

                    distanceToCallTarget = self.position.distanceTo(this.callTarget.position);
                    callSize = Math.round((width - distanceToCallTarget/100)/26);
                    c2D = call2D.clone();
                    c2D.x =  ( width  + c2D.x*width  )/2;
                    c2D.y = -(-height + c2D.y*height )/2;

                    this.ctx.fillStyle = this.menu.color;
                    this.ctx.fillText( enemies[j].name, c2D.x-30, c2D.y+10);
                    this.ctx.fill();
                }
            }

            // TARGET HUD MARKING
            if ( this.target ) {
                this.target = this.target.root;

                var vTarget3D = this.target.position.clone();
                var vTarget2D = s.projector.projectVector(vTarget3D, s.game.camera);

                var distanceToTarget, v2D, size;

                if ( Math.abs(vTarget2D.x) <= 0.95 && Math.abs(vTarget2D.y) <= 0.95 && vTarget2D.z < 1 ){
                    targetInSight = true;
                    distanceToTarget = self.position.distanceTo(this.target.position);
                    size = Math.round((width - distanceToTarget/100)/26);
                }

                // Targeting box
                if ( targetInSight ){

                    v2D = vTarget2D.clone();
                    v2D.x =  ( width  + v2D.x*width  )/2;
                    v2D.y = -(-height + v2D.y*height )/2;

                    this.ctx.strokeRect( v2D.x-size, v2D.y-size, size*2, size*2 );
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeStyle = this.menu.color;

                // Radial direction marker
                } else {

                    v2D = new THREE.Vector2(vTarget2D.x, vTarget2D.y);
                    v2D.multiplyScalar(1/v2D.length()).multiplyScalar(this.subreticleBound.radius+12);

                    this.ctx.beginPath();
                    if (vTarget2D.z > 1)
                        this.ctx.arc( -v2D.x+centerX, (-v2D.y+centerY), 10, 0, 2*this.PI, false);
                    else
                        this.ctx.arc( v2D.x+centerX, -(v2D.y-centerY), 10, 0, 2*this.PI, false);

                    this.ctx.fillStyle = "rgba(256,0,0,0.5)";
                    this.ctx.fill();
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeStyle = this.menu.color;
                    this.ctx.stroke();

                }


                /////////////////////////////////
                // PREDICTIVE TARGETING SYSTEM //
                /////////////////////////////////

                // PARAMETERS
                // aV   = vector from target to self
                // a    = distance between self and target
                // eV   = enemy's current velocity vector
                // e    = magnitude of eV
                // pV   = players's velocity vector
                // b    = magnitude of bV plus initial bullet speed
                // angD = angular differential
                // velD = velocity differential
                // t    = quadratic solution for time at which player bullet and enemy ship will simultaneously reach a given location
                if ( enemies[i] && targetInSight ){

                    var aV = enemies[i].root.position.clone().add( self.position.clone().multiplyScalar(-1) );
                    var a  = aV.length();
                    var eV = this.target.getLinearVelocity();
                    var e  = eV.length();
                    var pV = self.getLinearVelocity();
                    var b = 5000+pV.length();

                    if (eV && b && aV){
                        var angD = aV.dot(eV);
                        var velD = (b*b - e*e);

                        var t = angD/velD + Math.sqrt( angD*angD + velD*a*a )/velD;

                        // Don't show the marker if the enemy is more than 4 seconds away
                        if (t < 4){

                            this.trailingPredictions.push(eV.multiplyScalar(t));
                            var pLen = this.trailingPredictions.length;

                            // If the previous frames had a prediction, tween the midpoint of all predictions and plot that
                            if (pLen > 3){
                                var pX = 0, pY = 0;
                                for (var p = 0; p < pLen; p++){

                                    // Project 3D coords onto 2D plane in perspective of the camera;
                                    // Scale predictions with current camera perspective
                                    var current = s.projector.projectVector(
                                        this.target.position.clone().add( this.trailingPredictions[p] ), s.game.camera );
                                    pX += (width + current.x*width)/2;
                                    pY += -(-height + current.y*height)/2;

                                }
                                var enemyV2D = new THREE.Vector2(pX/pLen, pY/pLen);

                                if (enemyV2D.distanceTo(v2D) > size/3) {
                                    // Draw the prediction marker
                                    this.ctx.beginPath();
                                    this.ctx.arc(enemyV2D.x, enemyV2D.y, size/5, 0, 2*this.PI, false);
                                    this.ctx.fillStyle = "rgba(256,0,0,0.5)";
                                    this.ctx.fill();
                                    this.ctx.lineWidth = 2;
                                    this.ctx.strokeStyle = this.menu.color;
                                    this.ctx.stroke();
                                }

                                // remove the earliest trailing prediction
                                this.trailingPredictions.shift();

                            }
                        }
                    }
                // If the target is no longer on screen, but lastV2D is still assigned, set to null
                } else if ( this.trailingPredictions.length ) {
                    this.trailingPredictions = [];
                }
            }

        }
        /////////////////////////////////
        // PLAYER SHIELD/HEALTH STATUS //
        /////////////////////////////////

        if (this.hp !== s.config.ship.hull){
            var grd = this.ctx.createRadialGradient(centerX,centerY,width/12,centerX,centerY,this.health);
            grd.addColorStop(0,"rgba(0,0,0,0)");
            grd.addColorStop(1,"rgba(256,0,0,0.75)");

            // Fill with gradient
            this.ctx.fillStyle = grd;
            this.ctx.fillRect(0,0,width,height);
        }
        if (this.shieldsFull.alpha !== 0){
            var grade = this.ctx.createRadialGradient(centerX,centerY,width/12,centerX,centerY,width * (1.5 - this.shieldsFull.alpha));
            grade.addColorStop(0,"rgba(0,0,0,0)");
            grade.addColorStop(1,this.shieldsFull.color);

            this.ctx.fillStyle = grade;
            this.ctx.fillRect(0,0,width,height);
        }


        this.ctx.lineWidth = 1;
        this.ctx.fillStyle = this.menu.color;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 3, 0, 2 * this.PI, false);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 15, 0, 2 * this.PI, false);
        this.ctx.stroke();
    }

});
