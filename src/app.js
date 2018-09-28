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

