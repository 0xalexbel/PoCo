const ethUtil   = require('ethereumjs-util');
const sigUtil   = require('eth-sig-util');
const constants = require('./constants');
const wallets   = require('./wallets');



const TYPES =
{
	EIP712Domain: [
		{ name: "name",              type: "string"  },
		{ name: "version",           type: "string"  },
		{ name: "chainId",           type: "uint256" },
		{ name: "verifyingContract", type: "address" },
	],
	AppOrder: [
		{ type: "address", name: "app"                },
		{ type: "uint256", name: "appprice"           },
		{ type: "uint256", name: "volume"             },
		{ type: "bytes32", name: "tag"                },
		{ type: "address", name: "datasetrestrict"    },
		{ type: "address", name: "workerpoolrestrict" },
		{ type: "address", name: "requesterrestrict"  },
		{ type: "bytes32", name: "salt"               },
	],
	DatasetOrder: [
		{ type: "address", name: "dataset"            },
		{ type: "uint256", name: "datasetprice"       },
		{ type: "uint256", name: "volume"             },
		{ type: "bytes32", name: "tag"                },
		{ type: "address", name: "apprestrict"        },
		{ type: "address", name: "workerpoolrestrict" },
		{ type: "address", name: "requesterrestrict"  },
		{ type: "bytes32", name: "salt"               },
	],
	WorkerpoolOrder: [
		{ type: "address", name:"workerpool"          },
		{ type: "uint256", name:"workerpoolprice"     },
		{ type: "uint256", name:"volume"              },
		{ type: "bytes32", name:"tag"                 },
		{ type: "uint256", name:"category"            },
		{ type: "uint256", name:"trust"               },
		{ type: "address", name:"apprestrict"         },
		{ type: "address", name:"datasetrestrict"     },
		{ type: "address", name:"requesterrestrict"   },
		{ type: "bytes32", name:"salt"                },
	],
	RequestOrder: [
		{ type: "address", name: "app"                },
		{ type: "uint256", name: "appmaxprice"        },
		{ type: "address", name: "dataset"            },
		{ type: "uint256", name: "datasetmaxprice"    },
		{ type: "address", name: "workerpool"         },
		{ type: "uint256", name: "workerpoolmaxprice" },
		{ type: "address", name: "requester"          },
		{ type: "uint256", name: "volume"             },
		{ type: "bytes32", name: "tag"                },
		{ type: "uint256", name: "category"           },
		{ type: "uint256", name: "trust"              },
		{ type: "address", name: "beneficiary"        },
		{ type: "address", name: "callback"           },
		{ type: "string",  name: "params"             },
		{ type: "bytes32", name: "salt"               },
	],
	AppOrderOperation: [
		{ type: "AppOrder",        name: "order"     },
		{ type: "uint256",         name: "operation" },
	],
	DatasetOrderOperation: [
		{ type: "DatasetOrder",    name: "order"     },
		{ type: "uint256",         name: "operation" },
	],
	WorkerpoolOrderOperation: [
		{ type: "WorkerpoolOrder", name: "order"     },
		{ type: "uint256",         name: "operation" },
	],
	RequestOrderOperation: [
		{ type: "RequestOrder",    name: "order"     },
		{ type: "uint256",         name: "operation" },
	],
}

function signStruct(primaryType, message, domain, pk)
{
	message.sign = sigUtil.signTypedData(
		Buffer.from(pk.substring(2), 'hex'),
		{
			data:
			{
				types: TYPES,
				primaryType,
				message,
				domain,
			}
		}
	);
	return message;
}

function hashStruct(primaryType, message, domain)
{
	return ethUtil.bufferToHex(sigUtil.TypedDataUtils.sign({
		types: TYPES,
		primaryType,
		message,
		domain,
	}));
}

function signMessage(obj, hash, wallet)
{
	if (wallet.sign)
	{
		obj.sign = wallet.sign(hash).signature;
		return obj;
	}
	else
	{
		return web3.eth.sign(hash, wallet).then(sign => {
			obj.sign = sign;
			return obj;
		});
	}
}

/* NOT EIP712 compliant */
function hashAuthorization(authorization)
{
	return web3.utils.soliditySha3(
		{ t: 'address', v: authorization.worker  },
		{ t: 'bytes32', v: authorization.taskid  },
		{ t: 'address', v: authorization.enclave },
	);
}

/* NOT EIP712 compliant */
function hashContribution(result)
{
	return web3.utils.soliditySha3(
		{ t: 'bytes32', v: result.hash },
		{ t: 'bytes32', v: result.seal },
	);
}

function signAuthorization(obj, wallet)
{
	return signMessage(obj, hashAuthorization(obj), wallet);
}

function signContribution(obj, wallet)
{
	return signMessage(obj, hashContribution (obj), wallet);
}

function hashByteResult(taskid, byteresult)
{
	return {
		digest: byteresult,
		hash:   web3.utils.soliditySha3({ t: 'bytes32', v: taskid  }, { t: 'bytes32', v: byteresult }),
	};
}

function sealByteResult(taskid, byteresult, address)
{
	return {
		digest: byteresult,
		hash:   web3.utils.soliditySha3(                              { t: 'bytes32', v: taskid }, { t: 'bytes32', v: byteresult }),
		seal:   web3.utils.soliditySha3({ t: 'address', v: address }, { t: 'bytes32', v: taskid }, { t: 'bytes32', v: byteresult }),
	};
}

function hashResult(taskid, result)
{
	return hashByteResult(taskid, web3.utils.soliditySha3({t: 'string', v: result }));
}

function sealResult(taskid, result, address)
{
	return sealByteResult(taskid, web3.utils.soliditySha3({t: 'string', v: result }), address);
}

async function requestToDeal(IexecClerk, requestHash)
{
	let idx     = 0;
	let dealids = [];
	while (true)
	{
		let dealid = web3.utils.soliditySha3({ t: 'bytes32', v: requestHash }, { t: 'uint256', v: idx });
		let deal = await IexecClerk.viewDeal(dealid);
		if (deal.botSize == 0)
		{
			return dealids;
		}
		else
		{
			dealids.push(dealid);
			idx += deal.botSize;
		}
	}
}




/*****************************************************************************
 *                                 MOCK AGENT                                *
 *****************************************************************************/
class iExecAgent
{
	constructor(iexec, account)
	{
		this.iexec  = iexec;
		this.wallet = account
		? web3.eth.accounts.privateKeyToAccount(wallets.privateKeys[account.toLowerCase()])
		: web3.eth.accounts.create();
		this.address = this.wallet.address;
	}
	async domain() { return await this.iexec.domain(); }
	async signMessage                 (obj, hash) { return signMessage(obj, hash, this.wallet); }
	async signAppOrder                (struct)    { return signStruct("AppOrder",                 struct, await this.domain(), this.wallet.privateKey); }
	async signDatasetOrder            (struct)    { return signStruct("DatasetOrder",             struct, await this.domain(), this.wallet.privateKey); }
	async signWorkerpoolOrder         (struct)    { return signStruct("WorkerpoolOrder",          struct, await this.domain(), this.wallet.privateKey); }
	async signRequestOrder            (struct)    { return signStruct("RequestOrder",             struct, await this.domain(), this.wallet.privateKey); }
	async signAppOrderOperation       (struct)    { return signStruct("AppOrderOperation",        struct, await this.domain(), this.wallet.privateKey); }
	async signDatasetOrderOperation   (struct)    { return signStruct("DatasetOrderOperation",    struct, await this.domain(), this.wallet.privateKey); }
	async signWorkerpoolOrderOperation(struct)    { return signStruct("WorkerpoolOrderOperation", struct, await this.domain(), this.wallet.privateKey); }
	async signRequestOrderOperation   (struct)    { return signStruct("RequestOrderOperation",    struct, await this.domain(), this.wallet.privateKey); }

	async viewAccount()
	{
		return Object.extract(await this.iexec.viewAccount(this.wallet.address), [ 'stake', 'locked' ]).map(bn => Number(bn));
	}
	async viewScore()
	{
		return Number(await this.iexec.viewScore(this.wallet.address));
	}
}
/*****************************************************************************
 *                                MOCK BROKER                                *
 *****************************************************************************/
class Broker extends iExecAgent
{
	constructor(iexec)
	{
		super(iexec);
	}

	async initialize()
	{
		await this.iexec.setTeeBroker(this.wallet.address);
	}

	async signAuthorization(preauth)
	{
		const task   = await this.iexec.viewTask(preauth.taskid);
		const deal   = await this.iexec.viewDeal(task.dealid);
		const signer = web3.eth.accounts.recover(hashAuthorization(preauth), preauth.sign);
		if (signer == deal.workerpool.owner)
		{
			const enclaveWallet = web3.eth.accounts.create();
			const auth = await signAuthorization({ ...preauth, enclave: enclaveWallet.address }, this.wallet);
			return [ auth, enclaveWallet ];
		}
		else
		{
			return [ null, null ];
		}
	}
}
/*****************************************************************************
 *                               MOCK SCHEDULER                              *
 *****************************************************************************/
class Scheduler extends iExecAgent
{
	constructor(iexec, wallet)
	{
		super(iexec, wallet);
	}

	async signPreAuthorization(taskid, worker)
	{
		return await signAuthorization({ taskid, worker, enclave: constants.NULL.ADDRESS }, this.wallet);
	}
}
/*****************************************************************************
 *                                MOCK WORKER                                *
 *****************************************************************************/
class Worker extends iExecAgent
{
	constructor(iexec, wallet)
	{
		super(iexec, wallet);
	}

	async run(auth, enclaveWallet, result)
	{
		const contribution = sealResult(auth.taskid, result, this.wallet.address);
		if (auth.enclave == constants.NULL.ADDRESS) // Classic
		{
			contribution.sign = constants.NULL.SIGNATURE;
		}
		else // TEE
		{
			await signContribution(contribution, enclaveWallet);
		}
		return contribution;
	}
}

/*****************************************************************************
 *                                  MODULE                                   *
 *****************************************************************************/
module.exports = {
	/* mocks */
	iExecAgent,
	Scheduler,
	Broker,
	Worker,
	/* utils */
	utils: {
		signStruct,
		hashStruct,
		signMessage,
		hashAuthorization,
		hashContribution,
		signAuthorization,
		signContribution,
		hashByteResult,
		sealByteResult,
		hashResult,
		sealResult,
		hashConsensus: hashResult,
		hashAppOrder:                 function(domain, struct) { return hashStruct("AppOrder",                 struct, domain); },
		hashDatasetOrder:             function(domain, struct) { return hashStruct("DatasetOrder",             struct, domain); },
		hashWorkerpoolOrder:          function(domain, struct) { return hashStruct("WorkerpoolOrder",          struct, domain); },
		hashRequestOrder:             function(domain, struct) { return hashStruct("RequestOrder",             struct, domain); },
		hashAppOrderOperation:        function(domain, struct) { return hashStruct("AppOrderOperation",        struct, domain); },
		hashDatasetOrderOperation:    function(domain, struct) { return hashStruct("DatasetOrderOperation",    struct, domain); },
		hashWorkerpoolOrderOperation: function(domain, struct) { return hashStruct("WorkerpoolOrderOperation", struct, domain); },
		hashRequestOrderOperation:    function(domain, struct) { return hashStruct("RequestOrderOperation",    struct, domain); },
		requestToDeal,
	},
};
