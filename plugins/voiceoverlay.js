/* jshint esversion: 6, -W004 */
var http = require('http');
var fs = require('fs');
var express = require('express');
var amazejs = require("../startbot.js");
var colors = require('colors');

var app = express();
var discord = amazejs.getDiscord();
app.use(express.static('./web'));

function initialize_allUsers(num) {
	// reset allUsers
	allUsers = {};

	for(var ini_loop = 1; ini_loop <= num; ini_loop ++) {
		allUsers[ini_loop] = {};
		allUsers[ini_loop].user_id = 0;
		allUsers[ini_loop].user_name = "Not Connected";
		allUsers[ini_loop].ava_url = "Not Connected";
		allUsers[ini_loop].talking = false;
	}
}

var podcastVoiceChannelID = '280765404329017344';
var podcastServerID = '280764893953654784';
var podCastRole = {
	"Podcast": "",
	"PodcastGuest": ""
};
var allUsers = {}, isInitialized = false;

initialize_allUsers(12);


var server = app.listen(amazejs.getConfig().port, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log(amazejs.localDateString() + " | " + colors.green("[CONNECT]") + " Express app listening at http://%s:%s", host, port);
});

var io = require('socket.io').listen(server);

discord.on('ready', function() {
	// Add a role ID to the role name
	for(var pcr in podCastRole) {
		for(var role in discord.servers[podcastServerID].roles) {
			if(discord.servers[podcastServerID].roles[role].name == pcr) {
				podCastRole[pcr] = discord.servers[podcastServerID].roles[role].id;
			}
		}
	}

	io.on('connection', function (socket) {
		// add users in allUsers that are already connected
		if(isInitialized === false) {
			initialize_allUsers(12);
			for(var channel in discord.servers[podcastServerID].channels) {
				if(discord.servers[podcastServerID].channels[channel].id == podcastVoiceChannelID) {
					for(var user in discord.servers[podcastServerID].channels[channel].members) {
						var userID = discord.servers[podcastServerID].channels[channel].members[user].user_id;

						var userRoles = discord.servers[podcastServerID].members[userID].roles;
						var userHasRole = 0;

						for(var pcr in podCastRole) {
							if(userRoles.indexOf(podCastRole[pcr]) !== -1) {
								userHasRole = 1;
								break;
							}
						}

						if(!userHasRole)
							break;

						for(var alluser in allUsers) {
							if(allUsers[alluser].user_id === 0 && allUsers[alluser].user_name == "Not Connected" && allUsers[alluser].ava_url == "Not Connected") {
								allUsers[alluser].user_id = userID;
								allUsers[alluser].user_name = discord.users[userID].username;
								allUsers[alluser].ava_url = discord.users[userID].avatarURL;
								allUsers[alluser].talking = false;
								break;
							}
						}
					}
				}
			}

			isInitialized = true;
		}

		// initialized allUsers with users that are already connected, emit it to app
		io.emit('connectme', allUsers);

		// check if a user has joined or left the channel
		discord.on('any', function(event) {
			// Check if a user has gotten the role from podCastRole, if so show him too
			if(event.t == "GUILD_MEMBER_UPDATE") {
				var userID = event.d.user.id;

				// user is in podcastVoiceChannelID
				if(discord.servers[podcastServerID].members[userID].voice_channel_id == podcastVoiceChannelID) {
					var userRoles = event.d.roles;
					var userHasRole = 0;

					// check if user has the correct role
					for(var pcr in podCastRole) {
						if(userRoles.indexOf(podCastRole[pcr]) !== -1) {
							userHasRole = 1;
							break;
						}
					}

					if(!userHasRole) {
						for(var i in allUsers) {
							if(allUsers[i].user_id == userID) {
								allUsers[i] = {};
								allUsers[i].user_id = 0;
								allUsers[i].user_name = "Not Connected";
								allUsers[i].ava_url = "Not Connected";
								allUsers[i].talking = false;
								break;
							}
						}

						io.emit('users', allUsers);
						return;
					}

					// put the data in the first available spot
					for(var i in allUsers) {
						if(allUsers[i].user_id === 0 && allUsers[i].user_name == "Not Connected" && allUsers[i].ava_url == "Not Connected") {
							allUsers[i].user_id = userID;
							allUsers[i].user_name = discord.users[userID].username;
							allUsers[i].ava_url = discord.users[userID].avatarURL;
							allUsers[i].talking = false;
							io.emit('users', allUsers);

							return;
						}
					}

					// io.emit('users', allUsers);
				}
			}

			if(event.t == "VOICE_STATE_UPDATE") {
				var userID = event.d.user_id;
				var voiceChannelID = event.d.channel_id;

				// user has left the voice channel, remove user from array
				if(voiceChannelID === null) {
					for(var i in allUsers) {
						if(allUsers[i].user_id == userID) {
							allUsers[i] = {};
							allUsers[i].user_id = 0;
							allUsers[i].user_name = "Not Connected";
							allUsers[i].ava_url = "Not Connected";
							allUsers[i].talking = false;

							io.emit('users', allUsers);
							break;
						}
					}
				}
				else {
					// check if they are in the podcastVoiceChannelID
					if(voiceChannelID == podcastVoiceChannelID) {
						var userRoles = discord.servers[podcastServerID].members[userID].roles;
						var userHasRole = 0;
						var userAlreadyExist = {exist: false, id: 0};

						// check if the user has the correct role
						for(var pcr in podCastRole) {
							if(userRoles.indexOf(podCastRole[pcr]) !== -1) {
								userHasRole = 1;
								break;
							}
						}

						if(!userHasRole)
							return;

						for(var i in allUsers) {
							if(allUsers[i].user_id == userID) {
								userAlreadyExist.exist = true;
								userAlreadyExist.id = i;
								break;
							}
						}

						if(userAlreadyExist.exist) {
							allUsers[userAlreadyExist.id].user_id = userID;
							allUsers[userAlreadyExist.id].user_name = discord.users[userID].username;
							allUsers[userAlreadyExist.id].ava_url = discord.users[userID].avatarURL;
							allUsers[userAlreadyExist.id].talking = false;
						}
						else {
							for(var i in allUsers) {
								if(allUsers[i].user_id === 0 && allUsers[i].user_name == "Not Connected" && allUsers[i].ava_url == "Not Connected") {
									allUsers[i].user_id = userID;
									allUsers[i].user_name = discord.users[userID].username;
									allUsers[i].ava_url = discord.users[userID].avatarURL;
									allUsers[i].talking = false;
									break;
								}
							}
						}

						io.emit('users', allUsers);
					}
				}
			}
		});

		var botCheck = setInterval(function() {
			if(discord.servers[podcastServerID].members[amazejs.getConfig().ids.botId].voice_channel_id === null) {
				io.emit('botInVoice', false);
			}
			else if(discord.servers[podcastServerID].members[amazejs.getConfig().ids.botId].voice_channel_id !== podcastVoiceChannelID) {
				io.emit('botInVoice', false);
			}
			else {
				io.emit('botInVoice', true);
			}
		}, 1000);

		socket.on('disconnect', function() {
			clearInterval(botCheck);
		});
	});
});

discord.on('message', function(user, userID, channelID, message, event) {
	if(message.indexOf('!') === 0 && message.substr(1) == "join") {
		discord.joinVoiceChannel(podcastVoiceChannelID, function(error, events) {
			if (error) return console.error(error);

			//This can be done on both Node and the Browser using the same code
			events.on('speaking', function(voiceUserID, SSRC, speakingBool) {
				var userRoles = discord.servers[podcastServerID].members[voiceUserID].roles;

				for(var pcr in podCastRole) {
					if(userRoles.indexOf(podCastRole[pcr]) !== -1) {
						for(var u in allUsers) {
							if(allUsers[u].user_id == voiceUserID) {
								allUsers[u].talking = speakingBool;
								io.emit('voiceUpdate', allUsers);
								break;
							}
						}
						return;
					}
				}
			});
		});
	}
	else if(message.indexOf('!') === 0 && message.substr(1) == "leave") {
		discord.leaveVoiceChannel(podcastVoiceChannelID, function(err) {
			if(err) console.log(err);
		});
	}
	else if(message.indexOf('!') === 0 && message.substr(1) == "t") {
		console.log(allUsers);
	}
});
