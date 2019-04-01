var zero = require('zerosense');

var ChainBuilder = require('zerosense/ChainBuilder');
var Util = require('zerosense/Util');


function malloc(size) {	
	var chain = new ChainBuilder(zero.offsets, zero.addrGtemp)
		.addDataInt32("ptr")
		.callsub(zero.offsets.gadgetZ2, 0, size, 0, 0, 0, 0, zero.offsets.tocZ1, 0, 0, 0x70)
		.storeR3("ptr")
		.create();
	
	chain.prepare(zero.zsArray).execute();
	
	var ptr = chain.getDataInt32("ptr");
	
	return { ptr: ptr };
}

function free(ptr) {	
	var chain = new ChainBuilder(zero.offsets, zero.addrGtemp)
		.callsub(zero.offsets.gadgetZ3, 0, ptr, 0, 0, 0, 0, zero.offsets.tocZ1, 0, 0, 0x70)
		.create();
	
	chain.prepare(zero.zsArray).execute();
}


module.exports = {
	malloc,
	free,
};
