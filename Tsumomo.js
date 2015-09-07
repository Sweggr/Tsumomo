/*
						❤ TSUMOMO IRC BOT ❤

		Tsumomo is an IRC chat bot designed as a operator  for
		a  text-based  MMORPG  with an IRC interface written in
		JavaScript for Node.js. 

		Tsumomo uses the node-irc  library  for  connectivity  and 
		communication. IRC API available at: https://goo.gl/w9rsns
		
		-Segger 2015
*/


/*
	TODO
Set up !rest so that it heals 25% health per hour for players

!fortune for P3 clone of yen losee etc


Give players a flag that tells whether or not they're out of commision:
	aka, when dead, resting, fishing, whatever

Give new player prototype ability to feed defaults so players can be
instantiated with new stats without clearing save data.
*/

var irc = require('irc');
var fs = require('fs');
var fight = require('./fight');
var mart = require('./mart');
var items = require('./items');
var mart = require('./mart');

var fiend = require('./fiends');

	//MAIN TSUMOMO OBJECT
Tsumomo = function(server){
	if (!server){this.server="irc.rizon.net";} else{this.server= server;}
	
	var self = this; 				//Gives local context reference to events
	this.version = "0.7";
	this.name= "Tsumomo[BETA]";	//Nick
	this.options = { 				//IRC configuration object
		userName: "Tsumomo",
		realName: "Tsumomo",
		//channels:["#momoLab","#Fluffington"],
		channels:["#momoLab"],
		autoRejoin: true,
	};
	this.Players = {};
	this.momoMart = {};
	this.Queue = {};
	this.path = "./SAVEDATA ["+self.server+"].json"
	console.log("\n        \x1b[32m [Booting %s FW.%s on %s]  \x1b[0m \n",this.name,this.version,this.server);
	this.tsumomo = new irc.Client(this.server,this.name,this.options);
	



	/*
				INTERNAL UTILITY FUNCTIONS
		Provides various internally used functions
	*/

	//Saves players, mart data
	this.save = function(verbose){
		var data = {};
		data.Players = self.Players;
		data.momoMart = self.momoMart;
		var dataString = JSON.stringify(data);
		fs.writeFile(self.path,dataString);
		if (verbose){
			console.log("			[Data Saved]");
		}
	}

	//Loads save data from JSON
	this.load = function(){
		fs.readFile(self.path,"utf8",
			function(err,dataString){
				if (err){
					console.log("               ! ! ! ERROR LOADING FILE ! ! !\n");
					self.Players = false;		//Sets players to false to indicate error.
					return;
				}else{
					console.log("                [Data Loaded Successfully]\n");
					data = JSON.parse(dataString);
					self.Players = data.Players;
					self.momoMart = data.momoMart;

					//Iterate through players for debugging purposes.
					for (var nick in self.Players) {
						p = self.Players[nick];
						if (p.hp == 0){console.log("lol, "+p.nick+" is dead!")}
					};

				}
			}
		);

	}
	this.load();

	//Random number generator: min,max,[rounding(bool)]
	this.RNG = function(min,max,INT){
		INT = typeof INT !== "undefined" ? INT: 
		max -= min-1
		var RNG = (Math.random()*max)+min;
		RNG = Math.floor(RNG)
		return RNG;
	};

	//Concatenate args to string 'cat("woo: %s",value)'
	this.cat = function(str) {
	    var args =[].slice.call(arguments, 1),
	        i =0;
	    	return str.replace(/%s/g, function() {return args[i++];}
	    );
	};

	//New player prototype, accepts player object for defaults...]
	this.player = function(nick,player){
		this.nick = nick;
		this.yen = 0;
		this.yenTime = new Date(2015,1,1,1,1,1,1).getTime();
		this.fightTime = new Date(2015,1,1,1,1,1,1).getTime();
		this.level = 3;
		this.xp = 0;
		this.str = 8;
		this.def = 3;
		this.hp = 15;
		this.hpMax = this.hp;
		this.armor = new items.starterArmor() ;
		this.weapon = new items.starterWeapon() ;
		this.inventory = [];
		this.fiend = undefined;
	}
	



	/*			
						IRC FUNCTIONALITY
				Defines Tsumomo's IRC capabilities
	*/        
	
	//Send message to channel or nick.
	this.say = function(target,text){
		self.tsumomo.say(target,text)
		console.log("Tsumomo| "+text);
	};

	this.pm = function(nick,text){
		self.tsumomo.notice(nick,text);
		console.log("-PM ",nick.substring(0,10)+"- "+text);
	};

	//Request to check user status; Queue nick and command.
	this.requestStatus = function(nick,target,text){
		self.tsumomo.say("NickServ","STATUS "+nick)
		self.Queue[nick] = [target,text];
	};

	//Processes status replies and creates new players.
	this.processStatus = function(nick,text){
		var status = text.split(" ")
		var nick = status[1]
		var status = status[2]
		if (status == "3"){
			self.Players[nick] = new self.player(nick);
			console.log("Added user: ",nick);
			self.msgProcess(nick,self.Queue[nick][0],self.Queue[nick][1]) //Runs queued command if OK

		}else{
			//console.log(nick+" not identified.");
			self.pm(nick,"I only accept commands from registered nicks.  :P")
		}
		delete self.Queue[nick];
	};




	/*
						CHAT COMMANDS
		Defines actions which trigger on player input
	*/

	//Gives user random amount of yen.
	this.yen = function(nick,target,text){
		var player = self.Players[nick]

		if (player.hp<=0){ 												//Is player dead?
			deathmsg = self.cat("%s, dead bodies cannot take yen. ;-;",player.nick);
			self.say(target, deathmsg); 
			return false;
		}

		if(new Date().getTime() < player.yenTime){
			var remaining = player.yenTime- new Date().getTime();
			remaining = Math.ceil(remaining/60000)
			self.pm(player.nick,"You can collect more yen in "+remaining+" minutes! ^-^");
			return false;
		}else{
			var min = 30; //30 minutes till next fight
			var yTime = new Date().getTime() + (min*60000) ;
			player.yenTime = yTime;
		}

		var yen = self.RNG(50,5000);
		player.yen += yen;
		var wallet = player.yen;
		var display = self.cat("%s got ¥%s yen! You now have ¥%s!",nick,yen,wallet);
		self.say(target,display);
	};

	//Display user information
	this.stats = function(nick,target,text){
		text = text.split(" ");
		if (text.length>1){nick = text[1];}
		if (!self.Players[nick]){
			self.say(target,"Couldn't find "+nick);
			return;
		}
		var p = self.Players[nick];
		var display = cat("%s | ¥%s | LVL %s [%s XP] | %s/%sHP %s STR %s DEF | Wearing %s [+%s] | Wielding %s [+%s]|",nick,p.yen,p.level,p.xp,p.hp,p.hpMax,p.str,p.def,p.armor.detail,p.armor.def,p.weapon.detail,p.weapon.dmg);
		self.say(target,display);
	};

	//Fight fiends
	this.fight = function(nick,target,text){
		var text = text.split(" ");
		if (text[1] in self.Players){
			self.pm(nick,"Fighting other players will be implemented soon.")
			return false;
		};
		fight.npc(self,target,Players[nick]);
	};

	//Resets a player's stats 
	this.reset = function(nick,target,text){
		text = text.split(" ");
		if (text.length>1 & (nick =="Segger"|| nick=="mobiSegger" || nick=="Seggr")){nick=text[1];}
		if (!self.Players[nick]){self.say(target,"Couldn't find "+nick); return;}
		self.Players[nick] = new this.player(nick);
		self.say(target,nick+"'s stats were reset!!")
	};

	this.rez = function(nick,target,text){
		//self.say(target,nick+" was brought back to life!");
		//Players[nick].hp = Players[nick].hpMax;
	};


	//Rest for X hours, + 20% hp per hour, can't yen or fight
	this.rest = function(nick,target,text){

	}

	this.inventory = function(self,nick,target,text){
		txt = text.split(" ");
		if (txt.length>1){nick = txt[1];}
		if (!self.Players[nick]){ self.say(target,"Couldn't find "+nick); return;}

		inv = self.Players[nick].inventory
		if (inv.length == 0){self.say(target,nick+" doesn't own any items! >_<"); return; }
		
		var items = " ";
		for (var i = 0; i < inv.length; i++) {
			items+= inv[i].name+" | ";
		};
		var display = self.cat("%s posseses:%s",nick,items);
		self.say(target,display);
	}

	this.potion = function(self,nick,target,text){
		p = self.Players[nick];
		var potionGet = false;
		for (var i = 0 ; i < p.inventory.length; i++) {
			if (p.inventory[i].name == "Potion"){
				potionGet = i;
				console.log(i)
				break;
			}
		};

		if (potionGet===false){
			self.say(target, nick+", you don't have any potions!");
			return;
		}

		p.inventory.splice(potionGet,1);
		p.hp += 100;
		if (p.hp>p.hpMax){p.hp=p.hpMax;}
		self.say(target,nick+" drank a potion and restored 100 health!");

	}



	//Wildcard function for debugging.
	this.test = function(nick,target,text){
		console.log("\n Running debug function.\n");
	};




	/*
					IRC CALLBACKS
			Defines callbacks for IRC events.
	*/


	//Runs upon connection to server.
	this.connected = function(message){
		console.log("Connection to "+self.server+" successful. Got message:")
		console.log(message.args[1])
		self.tsumomo.say("nickserv","identify bacawn")
	}
	this.tsumomo.addListener("registered",this.connected);


	//Runs upon user connection to channel.
	this.join = function(channel,nick,message){
		//console.log("\nSuccessfully joined "+channel+"\n");
		//self.say(channel,self.name+" "+self.version);
	}
	this.tsumomo.addListener("join",this.join)


	//Runs when Tsumomo receives a notice.
	this.noticed = function(nick,to,text,message){
		var notice = text.split(" ")
		if (notice[0] == "STATUS"){
			self.processStatus(nick,text)
		}
	}
	this.tsumomo.addListener("notice",this.noticed);

	
	//Handles incoming messages.
	this.commands = ["!buy","!yen","!stats","!fight","!mart","!weapons","!armor","!shop","!reset","!rez","!test","!save","!inventory","!potion"];
	this.msgProcess = function(nick, target, text, message){
		var command = text.split(" ")[0].toLowerCase();
		
		if (self.commands.indexOf(command)==-1){ //Skip if command unknown
			return false;
		}

		if(!self.Players){ //Handle messages upon savedata load error
			if (command == "!save"){
				self.Players = {};
				self.save(true);
			}
			return false;
		}

		if (!(nick in self.Players)){ //Check if player is known, else ID them
			self.requestStatus(nick,target,text);
			return false;
		}		

		console.log(nick.substring(0,10)+"| "+text) //Display chat messages

		switch(command){
			case "!yen": self.yen(nick,target,text); break;
			case "!test": self.test(nick,target,text); break;
			case "!save": self.save(true); break;
			case "!stats": self.stats(nick,target,text); break;
			case "!fight": self.fight(nick,target,text); break;
			case "!reset": self.reset(nick,target,text); break;
			case "!rez": self.rez(nick,target,text); break;
			case "!mart": mart.greet(self,nick,target,text); break;
			case "!shop": mart.shop(self,nick,target,text); break;
			case "!buy": mart.buy(self,nick,target,text); break;
			case "!inventory": self.inventory(self,nick,target,text); break;
			case "!potion": self.potion(self,nick,target,text); break;
		}

		self.save();
		return true;
	}
	this.tsumomo.addListener("message",this.msgProcess);
	
	
	this.handleError = function(message){
		 console.log('Error: ', message)
	}
	this.tsumomo.addListener("error",this.handleError);

}

process.stdout.write('\033c'); //Clear screen

Tsumomo()