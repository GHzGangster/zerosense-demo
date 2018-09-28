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


function folderTest() {
	logger.info("Folder test...");
	
	Promise.resolve()
		.then(() => {
			var path = "/dev_hdd0/game/BLUS30109/USRDIR/dlc/";
			var result = FileSystem.opendir(path);
			var errno = result.errno;
			var fd = result.fd;
			logger.debug(`Errno: 0x${errno.toString(16)}`);
			logger.debug(`Fd: 0x${fd.toString(16)}`);
			
			var name = "";
			var type = 0;
			do {
				result = FileSystem.readdir(fd);
				errno = result.errno;
				type = result.type;
				name = result.name;
				if (name.length == 0) {
					break;
				}
				
				logger.debug(`File: ${type.toString(16)} ${name}`);
			} while (name.length > 0);
			
			result = FileSystem.closedir(fd);
			errno = result.errno;
			logger.debug(`Errno: 0x${errno.toString(16)}`);
		})
		.then(() => logger.info("Folder test done."))
		.catch((error) => logger.error(`Error while running folder test. ${error}`));
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
		if (name.length == 0) {
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
	if (type == 1) {
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
			fileListAdd(1, "/", "dev_hdd0");
		})
		.then(() => logger.info("File list test done."))
		.catch((error) => logger.error(`Error while running file list test. ${error}`));
}

