// =======================================
// Modules
// =======================================
var Discord = require("discord.io");
var fs = require("fs");
var colors = require("colors");

// ======================================
// Global variables
// ======================================
var discord, config, commands = {};

// ==========================================
// Load functions
// ==========================================
function loadConfig() {
    config = JSON.parse(fs.readFileSync("configfiles/config.json"));
    console.log(localDateString() + " | " + colors.green("[LOAD]") + "    Config file has been loaded!");
}

function loadPlugin(name, configObject) {
    var path = "./plugins/" + name + ".js";

    delete require.cache[require.resolve(path)];
    var plugin = require(path);

    for (var i in configObject) {
        plugin.config[i] = configObject[i];
    }

    if (plugin.commands) {
        for (var cmd in plugin.commands) {
            if (commands[cmd]) throw localDateString() + " | [ERROR]   Command " + cmd + " is already defined!";

            if (!plugin.commands[cmd].func) 		throw localDateString() + " | [ERROR]   No command function for " + cmd + "!";
            if (!plugin.commands[cmd].permission) 	console.warn(localDateString() + " | " + colors.yellow("[WARNING]") + " The command \"" + cmd + "\" doesn't have any permissions.");
			if (!plugin.commands[cmd].description) 	console.warn(localDateString() + " | " + colors.yellow("[WARNING]") + " The command \"" + cmd + "\" doesn't have any description.");
			if (!plugin.commands[cmd].usage) 		console.warn(localDateString() + " | " + colors.yellow("[WARNING]") + " The command \"" + cmd + "\" doesn't have any usage.");
			if (!plugin.commands[cmd].examples) 	console.warn(localDateString() + " | " + colors.yellow("[WARNING]") + " The command \"" + cmd + "\" doesn't have any examples.");

            commands[cmd] = plugin.commands[cmd];
            commands[cmd].plugin = path;
            commands[cmd].command = cmd;
        }
    }

    console.log(localDateString() + " | " + colors.green("[LOAD]") + "    Loaded the plugin " + name + "!");
}

function loadPlugins() {
    console.log(localDateString() + " | " + colors.green("[LOAD]") + "    Loading plugins...");
    var i, filename;
    var pluginFiles = [];
    var configs = {};
    fs.readdir("plugins", function(err, files) {
        if (err) throw localDateString() + " | [ERROR]   Error loading plugins: " + err;

        for (i = 0; i < files.length; i++) {
            filename = files[i];
            if (filename && filename[0] != '.') {
                if (filename.lastIndexOf(".js") == filename.length - 3) {
                    pluginFiles.push(filename);
                } else if (filename.lastIndexOf(".config.json") == filename.length - 12) {
                    configs[filename.substr(0, filename.length - 12)] = JSON.parse(fs.readFileSync("./plugins/" + filename));
                }
            }
        }

        for (i = 0; i < pluginFiles.length; i++) {
            var pluginName = pluginFiles[i].substr(0, pluginFiles[i].length - 3);
            if (configs[pluginName]) {
                loadPlugin(pluginName, configs[pluginName]);
            } else {
                loadPlugin(pluginName, {});
            }
        }
    });
}

// ======================================
// Exports
// ======================================
exports.getDiscord = function() {
	return discord;
};

exports.getConfig = function() {
	return config;
};

exports.localDateString = function() {
	var dateObject = new Date(),
		curDate = dateObject.toLocaleDateString(),
		curTime = dateObject.toLocaleTimeString();

	return curDate + " - " + curTime;
};

function localDateString () {
	var dateObject = new Date(),
		curDate = dateObject.toLocaleDateString(),
		curTime = dateObject.toLocaleTimeString();

	return curDate + " - " + curTime;
}

// ======================================
// Start the bot
// ======================================
// load extra things below here
loadConfig();
loadPlugins();

exports.discord = discord = new Discord.Client({
	autorun: true,
    token: config.botToken
});


discord.on("ready", function() {
	for(var i in discord.servers) {
		console.log(localDateString() + " | " + colors.green("[CONNECT]") + " Connected to the server: %s", discord.servers[i].name);
	}

    console.log(localDateString() + " | Logged in as %s, connected to %s servers. \n", discord.username, Object.keys(discord.servers).length);

	discord.setPresence({
        game: {
			"name": ""
		}
    });
});

discord.on("disconnected", function() {
    console.log("Connection lost! Reconnecting in 3 seconds");
    setTimeout(discord.connect, 3000);
});
