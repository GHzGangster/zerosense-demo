/*eslint-disable no-unused-vars, no-param-reassign*/

var zs = require('zerosense');

var Logger = require('zerosense/Logger');
var MemoryReader = require('zerosense/MemoryReader');
var Searcher = require('zerosense/Searcher');
var Offsets = require('zerosense/Offsets');
var Util = require('zerosense/Util');
var ZsArray = require('zerosense/ZsArray');

var ZsHelper = require('zerosense/helper/ZsHelper');
var FileSystem = require('zerosense/helper/FileSystem');


var logger = null;


(function() {
	try {		
		var ua = navigator.userAgent;
		
		zs.environment = {};
		zs.environment.ps3 = ua.indexOf("PLAYSTATION 3") !== -1;
		zs.environment.firmware = zs.environment.ps3 ? ua.substr(ua.indexOf("PLAYSTATION 3") + 14, 4)
				: "0.00";
		zs.environment.dex = true;
	
		var log = document.getElementById("log");
		if (log === null) {
			throw new Error("Log element not found.");
		}
	
		logger = zs.logger = new Logger(log);
	} catch (e) {
		alert(e);
		console.error(e, e.name, e.stack);
		return;
	}
	
	try {
		logger.clear();
	
		if (zs.environment.ps3) {
			logger.info(`Detected a PS3 on FW ${zs.environment.firmware} ${zs.environment.dex ? 'DEX' : 'CEX'}.`);
		} else {
			logger.info("No PS3 detected. May not work as expected.");
		}
		
		zs.memoryReader = new MemoryReader();
		zs.searcher = new Searcher(zs.memoryReader);
		zs.offsets = Offsets.get(zs.environment);
		
		Promise.resolve()
			.then(() => ZsHelper.initZsArray())
			.then(() => {
				var buttonFolderTest = document.getElementById("buttonFolderTest");
				buttonFolderTest.addEventListener("click", () => folderTest());
				
				fileListTest();
			})
			.catch((error) => logger.error(`Error while starting. ${error}`));;
	} catch (e) {
		if (zs.environment.ps3) {
			alert(e);
		}
		console.error(e, e.name, e.stack);
	}	
})();


///////////////////////////////////////

function dtime(message) {
	logger.debug(new Date().getTime() + " - " + message);
}

var ChainBuilder = require('zerosense/ChainBuilder');

function opendir(strpath) {
	dtime("opendir");
	
	var chain = new ChainBuilder(zs.offsets, zs.addrGtemp)
		.addDataStr("path", Util.ascii(strpath))
		.addDataInt32("errno")
		.addDataInt32("fd")
		.syscall(0x325, "path", "fd")
		.storeR3("errno")
		.create();
	
	dtime("created chain");
	
	// This is taking a long time...
	// Let's see if we can make this faster.
	var c = chain.prepare(zs.zsArray);
	
	dtime("prepared chain");
	
	//c.execute();
	
	dtime("executed chain");
	
	//var errno = chain.getDataInt32("errno");
	//var fd = chain.getDataInt32("fd");
	
	return { errno: 0, fd: 0 };
}

function folderTest() {
	logger.info("Folder test...");
	
	Promise.resolve()
		.then(() => {
			var path = "/dev_hdd0/game/BLUS30109/USRDIR/dlc/";
			var result = opendir(path);
			var errno = result.errno;
			logger.debug(`Errno: 0x${errno.toString(16)}`);
		})
		.then(() => logger.info("Folder test done."))
		.catch((error) => {
			logger.error(`Error while running folder test. ${error}`);
			console.error(error);
		});
}

///////////////////////////////////////

function getDirEntries(path) {
	logger.debug("getDirEntries " + path);
	
	var result = FileSystem.opendir(path);
	var errno = result.errno;
	var fd = result.fd;
	logger.debug(`Errno: 0x${errno.toString(16)}`);
	logger.debug(`Fd: 0x${fd.toString(16)}`);
	
	var entries = [];
	
	var name = "";
	var type = 0;
	do {
		result = FileSystem.readdir(fd);
		errno = result.errno;
		type = result.type;
		name = result.name;
		if (name.length === 0) {
			break;
		}
		
		entries.push({ type: type, name: name });
	} while (name.length > 0);
	
	result = FileSystem.closedir(fd);
	errno = result.errno;
	
	return { errno: errno, entries: entries };
}

var fileList = $("#filelist");

function fileListClear() {
	fileList.empty();
}

function fileListClickedFolder(event) {
	var path = event.data + "/";
	logger.debug(`Clicked folder: ${path}`);
	if (path.substr(path.length - 3) === "../") {
		path = path.substr(0, path.substr(0, path.length - 4).lastIndexOf("/") + 1)
	}
	
	var result = getDirEntries(path);
	if (result.errno === 0) {		
		var entriesSorted = result.entries.sort(function(a, b) {
			if (a.type < b.type) {
				return -1;
			} else if (a.type > b.type) {
				return 1;
			}
			if (a.name < b.name) {
				return -1;
			} else if (a.name > b.name) {
				return 1;
			}
			return 0;
		});
		
		fileListClear();
		for (var i = 0; i < entriesSorted.length; i++) {
			var entry = entriesSorted[i];
			fileListAdd(entry.type, path, entry.name);
		}
	}
	
}

function fileListAdd(type, parent, name) {	
	var path = parent + name;
	
	var entry;
	if (type === 1) {
		if (name === ".") {
			return;
		}

		if (name === "..") {
			entry = $("<li><a href=\"#\">" + name + "</a></li>").click(path, fileListClickedFolder);
		} else {
			entry = $("<li><a href=\"#\">" + name + "/</a></li>").click(path, fileListClickedFolder);
		}
	} else {
		entry = $("<li>" + name + "</li>");
	}
	
	fileList.append(entry);
}

function fileListTest() {
	logger.info("File list test...");
	
	Promise.resolve()
		.then(() => {
			fileListAdd(1, "", "");
		})
		.then(() => logger.info("File list test done."))
		.catch((error) => logger.error(`Error while running file list test. ${error}`));
}

