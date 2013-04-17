/*
	TinyUUID v1.0
	https://github.com/jlawrence/TinyUUID
	
	This library generates version 4 UUIDs in accordance with RFC 4122.
	
	Copyright (c) 2012 Joshua Lawrence
	Released under the MIT license.
	
	XXTEA implementation copyright (c) Chris Veness 2002-2010: http://www.movable-type.co.uk/scripts/tea-block.html
	Released under the Creative Commons Attribution 3.0 Unported License.
*/

var Uuid = new function() {
	var key = null;
	var counter = 1;
	
	/*
		Encrypts bytes using Corrected Block TEA (XXTEA) algorithm.
		The input array will be mutated to contain the encrypted bytes.
		
		v: An array of n 32-bit integers to encrypt. This will be mutated to contain the encrypted bytes.
		k: An array of 4 32-bit integers to use as key.
	*/
	var encrypt = function(v, k) {
		var n = v.length;
		var z = v[n-1], y = v[0], delta = 0x9E3779B9;
		var mx, e, q = Math.floor(6 + 52/n), sum = 0;

		while (q-- > 0) {  // 6 + 52/n operations gives between 6 & 32 mixes on each word
			sum += delta;
			e = sum>>>2 & 3;
			for (var p = 0; p < n; p++) {
				y = v[(p+1)%n];
				mx = (z>>>5 ^ y<<2) + (y>>>3 ^ z<<4) ^ (sum^y) + (k[p&3 ^ e] ^ z);
				z = v[p] += mx;
			}
		}
	};
	
	/*
		Converts the bits in a 32-bit number to an 8-character hexadecimal string. The normal toString(16) method will not work
		because the most significant bit would be interpreted as a sign bit.
	*/
	var bytesToHexString = function(num){
		if (num >= 0) {
			num += 0x100000000; // Set the bit in the 33rd position to 1 so that we can get our leading zeros.
			return num.toString(16).slice(1); // Chop off the part before the leading zeroes.
		} else {
			num ^= 0x80000000; // Flip sign bit.
			num += 0x80000000; // Flip the bit back, using addition so that the number is interpreted as a positive number.
			return num.toString(16);
		}
	};
	
	/*
		The nil UUID (00000000-0000-0000-0000-000000000000) as a string
	*/
	this.nil = "00000000-0000-0000-0000-000000000000";

	/*
		Initializes the generator. This method must be called before any UUIDs are generated.
		
		seedArray: An array of four random 32-bit unsigned integers (integers greater than or equal to 0 and less than 2^32) 
		to use as the seed for the random number generator. These numbers should be sent to the client from the
		server to reduce the probability that two clients will generate the same seed.
	*/
	this.initialize = function(seedArray) {
		if (seedArray.length !== 4) {
			throw new Error("The Uuid object must be initialized with an array of 4 32-bit integers.");
		}
		
		key = seedArray;
	};

	/*
		Creates a new UUID and returns it as a string. Hexadecimal values are lower case.
	*/
	this.create = function() {
		if (!key) {
			throw new Error("The Uuid object must be initialized before it can be used.");
		}
		
		// UUID Fields: time_low(32 bits) time_mid(16 bits) time_hi_and_version(16 bits) 
		// clock_seq_hi_and_reserved(8 bits) clock_seq_low(8 bits) node(48 bits)
		
		// Get pseudorandom data using XXTEA.
		var bytes = [counter, counter + 1, counter + 2, counter + 3];
		counter += 4;
		encrypt(bytes, key);
		
		// Add more randomness by XORing with Math.random.
		for (var i = 0; i < 4; i++) {
			bytes[i] = bytes[i] ^ Math.floor(Math.random() * 4294967296); // XOR with a random integer between 0 and (2^32 - 1), inclusive.
		}
		
		// RFC 4122 - "Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively."
		bytes[2] &= 0xBFFFFFFF;
		bytes[2] |= 0x80000000;
		
		// RFC 4122 - "Set the four most significant bits (bits 12 through 15) of the time_hi_and_version field to the 4-bit version number from Section 4.1.3."
		// (The 4-bit version number from Section 4.1.3. is 4 because we are generating a v4 UUID.)
		bytes[1] &= 0xFFFF0FFF;
		bytes[1] |= 0x00004000;
		
		// Convert to a string.
		var byteStrings = [bytesToHexString(bytes[0]), bytesToHexString(bytes[1]), bytesToHexString(bytes[2]), bytesToHexString(bytes[3])];
		var uuid = byteStrings[0] + "-" + byteStrings[1].slice(0, 4) + "-" + byteStrings[1].slice(4, 8) + "-" + byteStrings[2].slice(0, 4) + "-" +
			byteStrings[2].slice(4, 8) + byteStrings[3];
		
		return uuid;
	};
	
};