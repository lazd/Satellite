s.SatelliteGame = new Class( {
    toString: 'SatelliteGame',
    extend: s.Game,

	// Models that should be loaded
	models: [
		'phobos_hifi',
		'phobos_lofi',
        'human_ship_heavy',
		'human_ship_light'
	],

    textures: [
        'particle.png',
        'explosion.png'
    ],

    getRandomCoordinate: function(){
        var coefficient = 1;
        if (Math.random() > 0.5){
            coefficient = -1;
        }
        return Math.floor(Math.random()* 15000 + 15000) * coefficient;
    },

	initialize: function() {
		var that = this;

        this.IDs = [];
        this.rechargeShields = s.util.debounce(s.game.shieldBoost,7000);
		// No gravity
		this.scene.setGravity(new THREE.Vector3(0, 0, 0));

        // Ambient light
        this.ambientLight = new THREE.AmbientLight( 0x382828 );
        this.scene.add( this.ambientLight );

        // Directional light
        this.light = new THREE.DirectionalLight( 0xEEEEEE, 2 );
        this.light.position.set( -100000, 0, 0 );
        this.scene.add( this.light );
        this.sound = new s.Sound({
            enabled: s.config.sound.enabled,
            sounds: s.config.sound.sounds
        });

        // Add moon
        this.moon = new s.Moon( {
            game: this
        } );

        this.pilot = {};
        this.callsigns = this.callsigns || ["Apollo","Strobe","Sage","Polkadot","Moonglow","Steel","Vanguard","Prong","Uptight","Blackpony","Hawk","Ramrod","Dice","Falcon","Rap","Buckshot","Cobra","Magpie","Warhawk","Boxer","Devil","Hammer","Phantom","Sharkbait","Dusty","Icon","Blade","Pedro","Stinger","Yellow Jacket","Limit","Sabre","Misty","Whiskey","Dice","Antic","Arrow","Auto","Avalon","Bandit","Banshee","Blackjack","Bulldog","Caesar","Cajun","Challenger","Chuggs","Cindy","Cracker","Dagger","Dino","Esso","Express","Fangs","Fighting Freddie","Freight Train","Freemason","Fury","Gamma","Gear","Ghost","Ginger","Greasy","Havoc","Hornet","Husky","Jackal","Jaguar","Jedi","Jazz","Jester","Knife","Kitty Hawk","Knight","Knightrider","Koala","Komono","Lancer","Lexus","Lion","Levi","Lucid","Malty","Mail Truck","Magma","Magnet","Malibu","Medusa","Maul","Monster","Misfit","Moss","Moose","Mustang","Nail","Nasa","Nacho","Nighthawk","Ninja","Neptune","Odin","Occult","Nukem","Ozark","Pagan","Pageboy","Panther","Peachtree","Phenom","Polestar","Punisher","Ram","Rambo","Raider","Raven","Razor","Rupee","Sabre","Rust","Ruin","Sultan","Savor","Scandal","Scorpion","Shooter","Smokey","Sniper","Spartan","Thunder","Titus","Titan","Timber Wolf","Totem","Trump","Venom","Veil","Viper","Weasel","Warthog","Winter","Wiki","Wild","Yonder","Yogi","Yucca","Zeppelin","Zeus","Zesty"];

        this.pilot.name = this.callsigns[Math.floor(this.callsigns.length*Math.random())] + ' ' + ( new Date( ).getTime( ) % 100 );
        
        // Add a hud
        this.HUD = new s.HUD( {
            game: this
        } );

        // Add menu
        this.menu = new s.Menu({
            camera: this.camera
        });

        if (this.oculus.detected) {
            console.log('Activating oculus HUD');
            this.HUD.canvas.style.display = 'none';
            this.HUD.oculusCanvas.style.display = 'block';
        }

        this.player = new s.Player( {
            HUD: this.HUD,
            game: this,
            shipClass: 'human_ship_heavy',
            position: new THREE.Vector3(this.getRandomCoordinate(),this.getRandomCoordinate(),this.getRandomCoordinate()),
            name: this.pilot.name,
            rotation: new THREE.Vector3( 0, Math.PI/2, 0 ),
            alliance: 'alliance',
            camera: this.camera
        } );
        
        this.HUD.hp = this.player.hull;

        // Planet camera
        // this.scene.add(this.camera);
        // this.camera.position.set(10000,2000,10000);

        // Add skybox
        this.addSkybox( );
        this.addDust( );

        // Fly controls
        this.controls = new s.Controls( {
            game: this,
            player: this.player,
            camera: this.camera,
            HUD: this.HUD
        } );

        /******************
         Enemy setup
         ******************/
        this.enemies = {
            _list: [ ],
            _map: {}, // new WeakMap()
            get: function ( nameOrId ) {
                if ( typeof nameOrId == 'string' ) {
                    return this._map[ nameOrId ]; // return enemies._map.get(nameOrId);
                } else if ( typeof nameOrId == 'number' ) {
                    return this._list( nameOrId );
                }
            },
            has: function ( nameOrId ) {
                return !!this.get( nameOrId );
            },
            execute: function ( nameOrId, operation, args ) {
                var enemy = this.get( nameOrId );
                if ( enemy ) {
                    enemy[ operation ].apply( enemy, args );
                    return true;
                }
                return false;
            },
            forEach: function ( callback ) {
                this._list.forEach( callback );
            },
            list: function ( ) {
                return this._list;
            },
            delete: function ( nameOrId ) {
                var enemy = this.get( nameOrId );
                if ( enemy ) {
                    // Remove from map
                    delete this._map[ enemy.name ]; // this._map.delete(enemy.name);

                    // Remove from array
                    var enemyIndex = this._list.indexOf( enemy );
                    if ( ~enemyIndex )
                        this._list.splice( enemyIndex, 1 );

                    // destroy
                    enemy.destruct( );

                    return true;
                }
                return false;
            },
            add: function ( enemyInfo ) {
                if ( this.has( enemyInfo.name ) ) {
                    this.delete( enemyInfo.name );
                    console.error( 'Bug: Player %s added twice', enemyInfo.name );
                } else {
                    if ( enemyInfo.name === null ) {
                        console.error( 'Bug: enemyInfo contained null player name' );
                        console.log( enemyInfo );
                        console.trace( );
                    }
                    console.log( '%s has joined the fray', enemyInfo.name );
                }

                // TODO: include velocities?
                var enemyShip = new s.Player( {
                    game: that,
                    shipClass: 'human_ship_heavy',
                    name: enemyInfo.name,
                    position: new THREE.Vector3( enemyInfo.pos[ 0 ], enemyInfo.pos[ 1 ], enemyInfo.pos[ 2 ] ),
                    rotation: new THREE.Vector3( enemyInfo.rot[ 0 ], enemyInfo.rot[ 1 ], enemyInfo.rot[ 2 ] ),
                    alliance: 'enemy'
                } );


                this._list.push( enemyShip );
                this._map[ enemyInfo.name ] = enemyShip; // this._map.set(enemyInfo.name, otherShip);
            }
        };

        // Dependent on controls; needs to be below s.Controls
        this.radar = new s.Radar( {
            game: this
            //controls: this.controls
        } );



        window.addEventListener( 'mousemove', function ( e ) {
            that.HUD.targetX = e.pageX;
            that.HUD.targetY = e.pageY;
        } );
        window.addEventListener( 'mousedown', function ( ) {
            that.controls.firing = true;
        } );
        window.addEventListener( 'mouseup', function ( ) {
            that.controls.firing = false;
        } );
        window.addEventListener( 'keydown', function(e) {
            // Cycle through targets; extra logic guarding to prevent rapid cycling while the key is pressed
            e = e.which;
            that.HUD.changeTarget = (e === 69 ? 1 : e === 81 ? -1 : 0);
        } );



        this.comm = new s.Comm( {
            game: that,
            pilot: that.pilot,
            player: this.player,
            server: window.location.hostname + ':' + window.location.port
        } );

        this.comm.on('fire', that.handleEnemyFire);
        this.comm.on('hit', that.handleHit);
        this.comm.on('player list', that.handlePlayerList);
        this.comm.on('killed', that.handleKill);
        this.comm.on( 'join', that.handleJoin );
        this.comm.on( 'leave', that.handleLeave );
        this.comm.on( 'move', that.handleMove );

        this.HUD.controls = this.controls;

        this.handleLoadMessages('initializing physics');
        this.player.root.addEventListener('ready', function(){
            that.comm.connected( );
            s.game.start();
        });
	},

	render: function(_super, time) {
		_super.call(this, time);
		this.controls.update();
	},

	addSkybox: function() {
		var urlPrefix = "game/textures/skybox/Purple_Nebula_";
		var urls = [
			urlPrefix + "right1.png", urlPrefix + "left2.png",
			urlPrefix + "top3.png", urlPrefix + "bottom4.png",
			urlPrefix + "front5.png", urlPrefix + "back6.png"
		];

		THREE.ImageUtils.loadTextureCube(urls, {}, function(textureCube) {
            textureCube.format = THREE.RGBFormat;
            var shader = THREE.ShaderLib.cube;

            var uniforms = THREE.UniformsUtils.clone( shader.uniforms );
            uniforms.tCube.value = textureCube;

            var material = new THREE.ShaderMaterial( {
                fragmentShader: shader.fragmentShader,
                vertexShader: shader.vertexShader,
                uniforms: uniforms,
                side: THREE.BackSide
            } );

            this.skyboxMesh = new THREE.Mesh( new THREE.CubeGeometry( 200000, 200000, 200000, 1, 1, 1, null, true ), material );
            this.scene.add( this.skyboxMesh );
        }.bind(this));
	},

	addDust: function() {
		var starSprite = THREE.ImageUtils.loadTexture('game/textures/particle.png');
		var geometry = new THREE.Geometry();

		// Set to false for "dust", true for stars
		var outer = true;

		// Spec size
		var radius = 100000;
		var size = 100;
		var count = 1000;

		for (var i = 0; i < count; i ++ ) {

			var vertex = new THREE.Vector3( );

            if ( outer ) {
                // Distribute "stars" on the outer bounds of far space
                vertex.x = Math.random( ) * 2 - 1;
                vertex.y = Math.random( ) * 2 - 1;
                vertex.z = Math.random( ) * 2 - 1;
                vertex.multiplyScalar( radius );
            } else {
                // Distribute "dust" throughout near space
                vertex.x = Math.random( ) * radius - radius / 2;
                vertex.y = Math.random( ) * radius - radius / 2;
                vertex.z = Math.random( ) * radius - radius / 2;
            }

            geometry.vertices.push( vertex );

		}

		var material = new THREE.ParticleBasicMaterial( {
            size: size,
            map: starSprite,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            transparent: true
        } );

        this.dust = new THREE.ParticleSystem( geometry, material );

        this.scene.add( this.dust );
    },

    handleJoin: function ( message ) {
           s.game.enemies.add( message );
    },
    handleLeave: function ( message ) {
        if ( s.game.enemies.delete( message.name ) ) {
            console.log( '%s has left', message.name );
        }
    },
    handleMove: function ( message ) {
        if ( message.name == this.pilot.name ) {
            // server told us to move
            console.log( 'Server reset position' );

            // Return to center
            s.game.player.setPosition( message.pos, message.rot, message.aVeloc, message.lVeloc, false ); // Never interpolate our own movement
        } else {
            // Enemy moved
            if ( !s.game.enemies.execute( message.name, 'setPosition', [ message.pos, message.rot, message.aVeloc, message.lVeloc, message.interp ] ) ) {
                s.game.enemies.add( message );
            }
        }
    },

    handlePlayerList: function(message) {
        for (var otherPlayerName in message) {
            // don't add self
            if (otherPlayerName == this.player.name) continue;

            var otherPlayer = message[otherPlayerName];
            s.game.enemies.add(otherPlayer);
        }
    },

    handleKill: function(message) {
        // get enemy position
        var position = s.game.enemies.get(message.killed).root.position;
        new s.Explosion({
            game: this.game,
            position: position
        });
        s.game.enemies.delete(message.killed);
        if (message.killer == s.game.pilot.name)
            console.warn('You killed %s!', message.killed);
        else
            console.log('%s was killed by %s', message.killed, message.killer);
    },

    handleEnemyFire: function(message) {
        var bulletPosition = message.position;
        var bulletRotation = message.rotation;
        var initialVelocity = message.initialVelocity;

            new s.Turret({
                pilot: message.name,
                game: s.game,
                position: bulletPosition,
                rotation: bulletRotation,
                initialVelocity: initialVelocity,
                team: 'rebels'
            });

    },

    handleHit: function(message) {
        var you = message.otherPlayerName;
        var killer = message.yourName;
        if (you === s.game.pilot.name){
            s.game.stopShields();
            s.game.rechargeShields();
            if (s.game.player.shields > 0){
                s.game.HUD.menu.animate({
                    color: s.game.HUD.shields,
                    frames: 30
                });
                s.game.HUD.shieldsFull.animate({
                    color: s.game.HUD.shieldsDamaged,
                    frames: 30
                });
                s.game.player.shields -= 20;
            } else {
                s.game.HUD.menu.animate({
                    color: s.game.HUD.hull,
                    frames: 30
                });
                s.game.player.hull -= 20;
            }
            console.log('You were hit with a laser by %s! Your HP: %d', killer, s.game.player.hull);

            if (s.game.player.hull <= 0) {
                s.game.handleDie(you, killer);
            }
        } else {
            var enemy = s.game.enemies.get(you);
            enemy.shields -= 20;
            setTimeout(function(){
                console.log('recharged');
                enemy.shields = 800;
            }, 7000);
            console.log('hit: ', enemy);
        }

    },

    handleFire: function(props) {
        s.game.comm.fire(props.position, props.rotation, props.initialVelocity);
    },

    handleDie: function(you, killer) {
        s.game.stop();
        var HUD = s.game.HUD;
        HUD.ctx.fillStyle = "rgba(0,0,0,0.5)";
        HUD.ctx.fillRect(0,0,HUD.canvas.width,HUD.canvas.height);
        HUD.ctx.drawImage(HUD.gameOver,HUD.canvas.width/2 - HUD.gameOver.width/2,HUD.canvas.height/2 - HUD.gameOver.height/2);
        s.game.comm.died(you, killer);

    },
    shieldBoost: function(){
        s.game.IDs.push(setInterval(s.game.shieldAnimate,20));
    },
    shieldAnimate: function(){
        if (s.game.player.shields < s.config.ship.shields){
            s.game.player.shields += 1;
        } else {
            s.game.stopShields();
        }
    },
    stopShields: function(){
        for (var i = 0; i < s.game.IDs.length; i++){
            clearInterval(s.game.IDs[i]);
        }
    },

    handleLoadMessages: function(message){
        s.game.loadScreen.setMessage(message);
    }

} );
