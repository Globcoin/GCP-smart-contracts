var GlobCoinTokenSale = artifacts.require("GlobcoinTokenSale")
var GlobCoinToken = artifacts.require("GlobcoinToken")
var RefundVault = artifacts.require("RefundVault")


import EVMThrow from './helpers/EVMThrow'
import revert from './helpers/revert'

import {advanceBlock} from './helpers/advanceToBlock'

const should = require('chai')
  .use(require('chai-as-promised'))
  .should();


contract('GlobcoinTokenSale', function(accounts) {
  describe('Constructor', () => {
        let currentBlock = web3.eth.blockNumber;
        let globCoinSaleInstance;
        // start and end timestamps where investments are allowed (both inclusive)
        let startBlock = currentBlock + 3;
        let endPresale = currentBlock + 9;
        let startSale = currentBlock + 15;
        let endBlock = currentBlock + 30 ;
        // presale cap  12 000 ETH
        let presaleCap = 12000000000000000000000;
        // minimum amount of funds to be raised in weis - 1 ETH
        let goal = 1000000000000000000;
        // Maximum amount of funds to be raised - 10 000 ETH
        let cap = 12000000000000000000000;

        // address where funds are collected
        let wallet = "0xcf09f36227aa07e3318fa57a16b453d29ecf786d";

        before(async () => {
          globCoinSaleInstance = await GlobCoinTokenSale.new(startBlock,endPresale,startSale,endBlock,goal,presaleCap,cap,wallet, { from: accounts[0]});
        });

        it('should set startblock', async () => {
          let block = await globCoinSaleInstance.startBlock.call();
          assert.equal(block, startBlock);
        });
        it('should set endblock', async () => {
          let block = await globCoinSaleInstance.endBlock.call();
          assert.equal(block, endBlock);
        });
        it('should set goal', async () => {
          let instanceGoal = await globCoinSaleInstance.goal.call();
          assert.equal(instanceGoal, goal);
        });
        it('should set wallet', async () => {
          let instanceWallet = await globCoinSaleInstance.wallet.call();
          assert.equal(instanceWallet, wallet);
        });
        it('should instanciate GLO Token', async () => {
          let gloAddress = await globCoinSaleInstance.token.call();
          let gloInstance = GlobCoinToken.at(gloAddress);
          let gloSymbol = await gloInstance.symbol.call();
          assert.equal(gloSymbol, "GCP");
        });
    });
      describe('Sale Features', () => {
        let currentBlock = web3.eth.blockNumber;
        let globCoinSaleInstance;
        let gloInstance;
        // start and end timestamps where investments are allowed (both inclusive)
        let startBlock = currentBlock + 3;
        let endPresale = currentBlock + 9;
        let startSale = currentBlock + 15;
        let endBlock = currentBlock + 30 ;
        // presale cap  10 000 ETH
        let presaleCap = 12000000000000000000000;
        // minimum amount of funds to be raised in weis - 1 ETH
        let goal = 1000000000000000000;
        // Maximum amount of funds to be raised - 10 000 ETH
        let cap = 12000000000000000000000;
        // address where funds are collected
        let wallet = "0xcf09f36227aa07e3318fa57a16b453d29ecf786d";

            beforeEach(async () => {
              currentBlock = web3.eth.blockNumber;
              startBlock = currentBlock + 6;
              startSale = currentBlock + 15;
              endBlock = currentBlock + 30 ;
              globCoinSaleInstance = await GlobCoinTokenSale.new(startBlock,endPresale,startSale,endBlock,goal,presaleCap,cap,wallet, { from: accounts[0]});
              let gloAddress = await globCoinSaleInstance.token.call();
              gloInstance = GlobCoinToken.at(gloAddress);

              await globCoinSaleInstance.whitelistAddresses(new Array(accounts[1]), { from: accounts[0]})
            });


            it('should prevent exeeding the hard cap', async () => {
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "300000000000000000000000" ,gas: 4700000}).should.be.rejectedWith(revert);
            });

            it( 'should give the team their tokens if the sale is sucessful', async () => {
              while ( web3.eth.blockNumber != startSale) {
                await advanceBlock()
              }
              await web3.eth.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "10000000000000000000000" ,gas: 4700000});
              while (web3.eth.blockNumber < endBlock) {
                await advanceBlock()
              }
              await globCoinSaleInstance.finalize({from: accounts[0]});
              let foundationBalance = await gloInstance.balanceOf(wallet);
              // 173.25M tokens
              assert.equal(foundationBalance.toNumber(), 173250000000000000000000000);
            });

            it( 'should not give the team their tokens if the sale is unsucessful', async () => {
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await web3.eth.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "1" ,gas: 4700000});
              while (web3.eth.blockNumber < endBlock) {
                await advanceBlock()
              }
              await globCoinSaleInstance.finalize({from: accounts[0]});
              let foundationBalance = await gloInstance.balanceOf(wallet);
              assert.equal(foundationBalance.toNumber(), 0);
            });

            it('should not be able to participate after end block', async () => {
              while (web3.eth.blockNumber < endBlock + 1) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "100" ,gas: 4700000}).should.be.rejectedWith(revert);
              let saleEnded = await globCoinSaleInstance.hasEnded();
              assert.equal(saleEnded, true);
            });

            it('should not be able to participate if the cap is reached', async () => {
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "12000000000000000000000" ,gas: 4700000});
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "100" ,gas: 4700000}).should.be.rejectedWith(revert);
            });

            it('should not be able to finalize twice', async () => {
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await web3.eth.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "100" ,gas: 4700000});
              while (web3.eth.blockNumber < endBlock) {
                await advanceBlock()
              }
              await globCoinSaleInstance.finalize({from: accounts[0]});
              let finalized = await globCoinSaleInstance.isFinalized.call();
              await globCoinSaleInstance.finalize({from: accounts[0]}).should.be.rejectedWith(revert);
            });

            it('should allow refunds if the softcap isnt reached', async () => {
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await web3.eth.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "100000000000000000" ,gas: 4700000});
              let balanceAfterPurchase = await web3.eth.getBalance(accounts[1]);
              while (web3.eth.blockNumber < endBlock) {
                await advanceBlock()
              }
              await globCoinSaleInstance.finalize({from: accounts[0]});
              await globCoinSaleInstance.claimRefund({ from: accounts[1] });
              let afterRefundBalance = await web3.eth.getBalance(accounts[1]);
              assert.isAbove(afterRefundBalance.toNumber(), balanceAfterPurchase.toNumber(), 'balance is greater after refund');
            });

            it('anyone can ask for refund', async () => {
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await web3.eth.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "100000000000000000" ,gas: 4700000});
              let balanceAfterPurchase = await web3.eth.getBalance(accounts[1]);
              while (web3.eth.blockNumber < endBlock) {
                await advanceBlock()
              }
              await globCoinSaleInstance.finalize({from: accounts[0]});
              let vaultAddress = await globCoinSaleInstance.vault();
              let RefundVaultInstance = RefundVault.at(vaultAddress);
              await RefundVaultInstance.refund(accounts[1], { from: accounts[2] });
              let afterRefundBalance = await web3.eth.getBalance(accounts[1]);
              assert.isAbove(afterRefundBalance.toNumber(), balanceAfterPurchase.toNumber(), 'balance is greater after refund');
            });


            it('should not be able to participate if hasnt started', async () => {
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "100" ,gas: 4700000}).should.be.rejectedWith(revert);
            });


            it('should not be able to participate if sender isnt whitelisted', async () => {
              await globCoinSaleInstance.sendTransaction({ from: accounts[2], to: globCoinSaleInstance.address , value: "100" ,gas: 4700000}).should.be.rejectedWith(revert);
            });

            it('should be sucessfully completing the sale', async () => {
              //Refactor this to use advanceToBlock(startBlock);
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "12000000000000000000000" ,gas: 4700000});
              await globCoinSaleInstance.finalize({from: accounts[0]});
              let balance = await gloInstance.balanceOf(accounts[1]);
              assert.equal(balance, 135500000000000000000000000);
              let isFinalized = await globCoinSaleInstance.isFinalized();
              assert.isTrue(isFinalized);
              let balanceOwner = await gloInstance.balanceOf(wallet);
              assert.equal(balanceOwner, 203250000000000000000000000);
            });

        });

        describe('Sale Whitelisting', () => {
          let currentBlock = web3.eth.blockNumber;
          let globCoinSaleInstance;
          let gloInstance;
          // start and end timestamps where investments are allowed (both inclusive)
          let startBlock = currentBlock + 3;
          let endPresale = currentBlock + 9;
          let startSale = currentBlock + 15;
          let endBlock = currentBlock + 30 ;
          // presale cap  10 000 ETH
          let presaleCap = 12000000000000000000000;
          // minimum amount of funds to be raised in weis - 1 ETH
          let goal = 1000000000000000000;
          // Maximum amount of funds to be raised - 10 000 ETH
          let cap = 12000000000000000000000;
          // address where funds are collected
          let wallet = "0xcf09f36227aa07e3318fa57a16b453d29ecf786d";
          let arrayAddress = ["0xfcfa5773bd532d5f91558735c468eeb2951b5d65","0x4196b2c44f3114843d794191a043278012d41b6b","0xc47d679d783f5c509574fceac111ef1679267678","0xde709c943b5562a1510daf67e0a2f917d5b78ce0","0x5ce3cf7763d367f48e897076440e997b31a991a2","0x9ccf164f4845b76e59226242a5b61ffeb39fc670","0x3ed4d60710606c03fc575e3769893423ba2fd60e","0x10d20a56b8e1407386664c6288a63b3ebc23662c","0x09a67ab2def60b99a8962a5678d2724b3436af27","0xa624ffe58d195cd54d7f0fa30de191621f212cfb","0x4cee27b65eae510f08e68a9c940720262ec7d48d","0x16aa619844d292f5bc4270a395c8f17e7521f90f","0xd3188fde83e404dab094662ea8225ec93c389918","0xf764bbc077bc6a100f88cbe922e9a245e5ccd7d5","0xf94dbc8eb2644279a8dfbb43e75401360d23e9fc","0x5f9e3886db2bc069a71b31a337939df36cdf7ba7","0x9496e16ae94bfe2a8a5b76cad9a9175c5298510f","0xab94968e6013af1ec988fa98f70e12fc06ab5741","0xc81b78336639346b7c60fbf78406966c38c63a60","0x060c023f7758679bc2ff7e8574dca3930a674169","0x2826f72a4a296865510fabfab0b853cacb4d328d","0xe6c931095acebcfcdf2e0f344e6c2ccc97324c16","0xc98e8d76581b79009d23e38554bf62a4ebf5678f","0x6d886a2b257815d6c8bb48b817f33c51211622ac","0x2dc49cd91f04b49abc691773ffded9a47218c350","0x1ec24b8144b9d5b98f07a134ab176ba02082a5b1","0xcaa5ebe4f3105770906c9393d9757e1f1a743128","0x0913d52882375801d15a8eed623f9914cd41fa5f","0x8ca6ccb3ca75d9c40c704e2a4fc99db11c9f6f5e","0x80068b1253f06c8ba8c2e8e6b40b434e03e3c33a","0x951d12488d43992f42794490555e13baeeb92454","0xeece7078e2d2d3697c0a2dd1b087fbdad0814093","0x1ef07f91584b181d96ceda0f15eee5cebae6baa6","0xda21a8f076c2de31b4a9a5f3d91cf9f9fe0024cd","0x5cafe9d7d11094eec4e1069402ea06c26dafc4c9","0x151af309cad1b7a9b073c9ffeb92fe19df740681","0x7c281142109a1de4b77d08cb865d98bd000869cd","0x9f8e0c5cede2b8faa7e7b3aae1b18c76d42a5937","0x1b8826a44c4eed5906c5a32d0ef411eb8085266e","0x21d8d719d9af56e5db4e83ec80a69c26c3fa364b","0xeeac994bd802109337f372950014ad5e4db835f4","0x563bc435e5909784e4afe5d2d2488f603a62a569","0x9d9e1bfae02955c620c5e91dc12a96ea806a7859","0x6d9829b48d9e5b7765715e64d03edefa0bfe11c5","0xf40163a47f0b79bb321bbd8f7b2bae3d6ca3841e","0x3c5f06870410de4318d16090534f722fc4732899","0x89cc29fb78ba41ab6c996636b4dcabaab2158044","0xc7aa7790e4b527ed66c2c42f5ecf63eb621fce51","0xb9778b23cea9a4b132b1ca9ca266fbf89fb69509","0x565a977e84b138c4a6eb2733574091fdabc00361","0xf0792c2be52a76a4714d529ec7089bbcb83b83d3","0xfee51bd34be3bff4373640ae575d033335412836","0x8a08b46811e0169a5fa34819ed62971f3b362101","0xb5662e42b5de9d775596b029a65691980b583601","0x6c622d4f45777ac2e4838af26fafc99849fe566e","0x6825e2e7729aa3a91f8bc5cf64397e96023a060a","0xbb383d0f38e4089c8e23b4b0bdec3f951accde2c","0xbd775f9f8977af4af3952525ae616a215d68dc96","0xdc59632f2a373b9c87c6a282117c3efa82a66d18","0x6b257f12c99d27cd5efa615e6cf31cd69cf5bcd1","0xefe081e9be5382d2b9fac72b42b1240894e96e5e","0x0ad6734c6bce2de779faa3cad5e8ac868346e120","0x1ac925b750b627b1de14815dcee8e15788dfcff5","0x8299d085b8dc881ca895a88831728984210e730c","0x1b65d5d05334b19da209ce4b98be8ccecd3cb9a2","0xaa7f795e30bba6a86510281c274116acf688745c","0x0b5bd93d35926479abcd6444c84f5535dde0bbd5","0x0886d9fd600d22327cff46deb71900e414db13a7","0x53337e966396d2185ab16e92a731933aecd87a00","0xd9eeedb90cc7992dc25ab9b674e4104d0b45302d","0x654fc05de2a60d34ae39d58be5dbdd98e455421f","0xdc7213a0f2dea7a0bb123174296a948fbfd43f5c","0x7e2514f94c098879727b76e5636856cb6c58211d","0xdf4a2dd8571894cc4a218ef8e9713fb3253a441e","0x116f6255fb16ee5ef62067c10e5526c3dfd97c64","0x0a543b0e9b2a70496d277e55f86149c2bf8d7fc6","0xfd2cb7e13c5da59e0639c8479c387e3109032d2d","0x897b00539378d0a90e639c21ec66cd3493d19636","0xbbfce9aa5b13aca2ab0d20d734740bb538319a58","0x8c84be0323977cd63f2229450f2a79f5852269a8","0x82e5cc5b8ca2ade6348ac6ee1fccf13c1ffa7d0d","0x4be32eb73ef1972952dda3aee77ae83a5586b5aa","0xbebc8e5accaae8fd976735a8bdbbe8ea7e0ce0d4","0x1f6d53a5bb46ba0be09681f488ec2fd43cde858f","0x0af797a6cfbaf65aeffff4aa8ab86b3f7dd8d450","0x2608a0c105878ce7ce9ac2f2f6ef3acda2f9360b","0x383902abcd92c54b7600cc6a447d7cc9f0ea029d","0x4ac11da70428af74ad0f87a58c2a54dbe3432bce","0x0dc95c1998a1547ebda1a9e9aaa64892b4a56b75","0x55d01e6adab05da5b585cb8d1351870355047a10","0x483d15d52de7e80554b05c88908e1af0a0e3a3ff","0x556e8013e9762ad99ab14993d158323005221fef","0xe43df9920798f0663ee0f7f764dd9a1500b66b71","0xd901f927be450ea455584de2d36e3b5e20e3810b","0x58cecfc89f107bb9818c21164172f3c88e550f6b","0x940ae87c67b8ebd1dae344ab6a4f40fe258daa87","0xa08628da5c2657501aa5634dc3a44d7b7a60d737","0x7adb24fe598a2df1db5182acea988b3984c799fe","0x7c65d776101a7cf5a5529cf4eae1b1e1d268b53d","0x5d628dadaad245b8179a80653c412a45e49c7b66","0xf4ccf2f8f889f2436b4c797f01890c35830ff3a6","0x2891a5bdf7d7f859826af5ff07f68cdea4af3cfd","0xeaca1b5f9fa86a7b00f5b4b96e1be5e26cdc44ab","0x572537f026144c06a13d6c0172942c93889315d6","0xbbd6f6fa0698fb1a95ad70c3d2e7d84fb1000bdc","0x345c24e624877eeae53f1c5b00449d213acd4b86","0x30ffd9a5c1e18d18f08cf61c3a7ae8e27410e397","0xc728f706eb033ad8f69ba6bbf62d2ebf24d5aaed","0x6f8da6d94c0fc832054e549216ea4f6f72d859d7","0xb2dba9bcf44905f31597c84b56636c959ab4aa5a","0x9cdf4e8e4cdb91ea7eaa934f4a59c501436d1f98","0x75389ab3c3928700caae46c393e43e06b3d82c4a","0x08464bd7b71b5589dae9f539fb7c03c78724b9a8","0xb419e5521643c3eb8d3f2c3e32bde3256a9e32e7","0x64f03cae4335ce6f956c9a1834a453497486d771","0xae0d788f2166f38b13089de02be72ef695ac9be6","0x763c747e646288bc30640e7e4b612284cf4c2a4b","0x14131f0a929b0dd88b81d09b9568cea6aa2800ba","0x72fe8d090f470670c81505d889535519e9fc4e8f","0x122389ab360f99456146580921b8d2e3c63d984d","0x72e62222ce7d7a8b46985d75778aad0f937d8f56","0xca6386a5e13668dd3c1fa6f44b564c199220fd68","0xaea1d7c7fa2d1ce2341c6bf04c4b4524f01f2612","0x69e03a3093b5d52877da192668367e319757f33a","0x9d2be7f6dbf9da57664a273df0db56929f4dacc8","0x011639fe4ee5833f643905a51d52f9a9fce02868","0x7f71ee1694412af6929ea364840e1d32e89615b9","0x1d71e3430a9c8ac078ae29bcc48cb3ec0b30bcf7","0x453050064a0a26ca755f79fdf7c5a23119005523","0xb356d8c44a2094a9aa7f781625693c4cea1f2a75","0xeb78b85337568cd256a70e1ed65ac0e5583c49fd","0xf5df9eee403e98a05931517412ecea74ee42eba3","0xaa87e651e0a0c10bba3d62fe6a6e4848d8803e44","0xb6000a109fb7d2272ebba0407487689f1116d36c","0x5f6bdb9398416350caad438547d3d34fcb99d2c7","0x14a1e9192cd35e61369f382358c49e5e8c8a2dde","0xd547afba119861a3b972045ae8a8fb98a72ee3fb","0xe35c6ff979b5a0a23a37a357c210db84812353f6","0x19523032d7b156a6966f468cccd256e1c17e1991","0x845497831858a827d289aea0a9aab819c30c77e4","0xafe8ece2cc60ff4e023d8381812a75302c3e3c69","0x5db1a55fa0d984476522654e5c5aaac4949aecc9","0x3160b4df3059fc5e8fc6b3faa1f65ac2c546ea85","0xe13d0237e5b26772ceed28f06cd722290ed8c43b","0x3c0c71e42a0579efba79c7e8b0c4f6cb05b56433","0xa796e05bdb5a0ce2e41a5f7aaccd4228d543279f","0x74892bc5025226abac8d1f456bd1e0fd7ea5b506","0x3c9b4a27bcc61c4bddd4f29f1d4b4cb760b83f56","0x2c74cd6bfdaa9d3da7de8e8c9b479184eaa785b8","0x0b3381c16ccb42a8a31892e3b3da6e55177716d0","0xebdd0d51bb88ec88b11e8aff34ec22987c71b9fc","0x44b339cbb80ab98463c33f99972b9d570438a3cc","0x815b02988ec74a3cad259b21cde3395acd40ac13","0xe0fb5e64f799de1dc7bf2776b88f9d9f892165a8","0x42ab02b064407a6305fa4ca3664208ed830abc14","0xc11047208ab85c0921cfbde453d0f77abb9e41e1","0x47bcd823ac176a1edc5eabec570bab99529f702f","0x2247b89ddb4923101be0b829e52f84ea1a761536","0x2299bc2425ac2bd000c6594208805b4f4f552faa","0xff02ba75414ed2b95269cb2df377ef77c433b86a","0xd50ba1034279f6ca113a2c8ed188cac914cb8a5b","0x22f20a0b4fda4c8808a4f5021762e2d5743cd6a7","0xa3ce640ff027a00db4ce610612d13c064cee6dcf","0xfed5e97495fdcdce7a71af709d41697eccd4d144","0xd198677e86459d8cb22bc3a772318ab91ae80432","0x3229d8d02666b928b11e14bbeed1907316bb839e","0x665320c046f5f06d2f5788a517ca6a4b9e2c2f8d","0x8312cf3f9d4806894469f778295af0dc47d6cc6c","0xaa218a8154cb810d6fd0286e2019ad2f1448f94b","0x6e8aed9746d6e92afcdbbae2c637a17bb4037b74","0xff30ae14d81116d34157bd924489c0aa328414c1","0x0b55149933dcb91fe5be77604d9710f85c97859f","0xb2552cbe9ea51dcd02f9c5f5e1e1008fe45105d0","0x8d0978321822b70377f4eca2a76abad883b198c7","0x4be31fdc4e9891ee7c31d2a8e9fa1f26eacff5b7","0xd9e61f0f0da5226b8e2130633e0ad1ed02849f8d","0xdd0bd0986eb7024543146bd48155b9e3d002b6b7","0x125f36ae1d20d3791641483a320453934f81a493","0x4c64009927d72bfe8ed1eeba14377af0782c6b47","0x9d4114f6a94930380109a0ce5f4f5b451d477bfb","0x7678b455687f21cb933effcb1b38ec08a1e29445","0xac80bbbabb0c9d9c4646715370680fae2761a078","0x595738c42da9bfe7798b7bf651315df1dec6ba3b","0x12b3e6da5d57d03797f6393d86ce3242c643ccd4","0x4069238c267d59ad61cc5aa071b55dbb2d8a5934","0xecf769ba385842032a6d386c7f86d78621b79322","0x69c914c475bba3238dbff176ca6cdca5a63acf12","0x660d48734ac07bbbcf0b36f1eaab5697328c90b2","0x0ebeefe522359999bec3abaf8dc5132e45a4cbc9","0xf27c73e11049cd79df5c3e908f95d4f0e97cccef","0xa66f780c7c31a7587ce7b87b53bd24db7c7759c9","0x57818cf46cf3690aa525559b9bce64d399b688bc","0x06e6a7b8cb938a7a2cf6b386111737c96049f23c","0xf076fd806ce6d1872e24274008e16c274abd0291","0x6846d977e2336da9dfcaa4b5d13df7fb844186fe","0xe040af020fb843ff9aaa9581659b6b9e38b04906","0xf960849dfc86016fbb0b3cee32323e2cecd42d35","0x4cbfa5506635ead3a16e630301acac26ec016b87","0xe705cc21001847fafbcb08fbd1fca8c0068b4212","0x66255203e258b36086881763295fbe075ddf06f0"];


              beforeEach(async () => {
                currentBlock = web3.eth.blockNumber;
                startBlock = currentBlock + 3;
                endPresale = currentBlock + 9;
                startSale = currentBlock + 15;
                endBlock = currentBlock + 30 ;
                globCoinSaleInstance = await GlobCoinTokenSale.new(startBlock,endPresale,startSale,endBlock,goal,presaleCap,cap,wallet, { from: accounts[0]});
                let gloAddress = await globCoinSaleInstance.token.call();
                gloInstance = GlobCoinToken.at(gloAddress);
              });

              it('should whitelist 200(full block) addresses', async () => {
                await globCoinSaleInstance.whitelistAddresses(arrayAddress, { from: accounts[0],gas: 4700000});
                assert.isTrue(await globCoinSaleInstance.isWhitelisted.call("0x16aa619844d292f5bc4270a395c8f17e7521f90f"));
              });


              it('should unwhitelist address', async () => {
                let arrayAddress = ["0xfcfa5773bd532d5f91558735c468eeb2951b5d65"];
                await globCoinSaleInstance.whitelistAddresses(arrayAddress, { from: accounts[0]});
                await globCoinSaleInstance.unwhitelistAddress("0xfcfa5773bd532d5f91558735c468eeb2951b5d65", { from: accounts[0]});
                assert.isFalse(await globCoinSaleInstance.isWhitelisted.call("0xfcfa5773bd532d5f91558735c468eeb2951b5d65"));
              });

          });
      describe('Sale Distribution 2', () => {
        // v10 globcoin
        let currentBlock = web3.eth.blockNumber;
        let globCoinSaleInstance;
        let gloInstance;
        // start and end timestamps where investments are allowed (both inclusive)
        let startBlock = currentBlock + 3;
        let endPresale = currentBlock + 9;
        let startSale = currentBlock + 15;
        let endBlock = currentBlock + 30 ;
        // presale cap  10 000 ETH
        let presaleCap = 12000000000000000000000;
        // minimum amount of funds to be raised in weis - 1 ETH
        let goal = 1000000000000000000;
        // Maximum amount of funds to be raised - 10 000 ETH
        let cap = 12000000000000000000000;
        // address where funds are collected
        let wallet = "0xcf09f36227aa07e3318fa57a16b453d29ecf786d";

            beforeEach(async () => {
              currentBlock = web3.eth.blockNumber;
              startBlock = currentBlock + 3;
              endPresale = currentBlock + 9;
              startSale = currentBlock + 15;
              endBlock = currentBlock + 30 ;
              globCoinSaleInstance = await GlobCoinTokenSale.new(startBlock,endPresale,startSale,endBlock,goal,presaleCap,cap,wallet, { from: accounts[0]});
              let gloAddress = await globCoinSaleInstance.token.call();
              gloInstance = GlobCoinToken.at(gloAddress);
              await globCoinSaleInstance.whitelistAddresses(new Array(accounts[1]), { from: accounts[0]})
              await globCoinSaleInstance.whitelistAddresses(new Array(accounts[2]), { from: accounts[0]})

            });

            it('should give 13000 Token at the startSale Block of the sale for 1 wei.', async () => {
              //Refactor this to use advanceToBlock(startBlock);
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: 1 ,gas: 4700000});
              let balance = await gloInstance.balanceOf(accounts[1]);
              assert.equal(balance, 13000);
            });

            it('should give 1300000000 Token at the startSale Block of the sale for 100000 wei.', async () => {
              //Refactor this to use advanceToBlock(startBlock);
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: 100000 ,gas: 4700000});
              let balance = await gloInstance.balanceOf(accounts[1]);
              assert.equal(balance, 1300000000);
            });

            it('should give 39000000000000000000012000 Token at the startSale of the sale for 3000000000000000000001 wei.', async () => {
              //Refactor this to use advanceToBlock(startBlock);
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "3000000000000000000001" ,gas: 4700000});
              let balance = await gloInstance.balanceOf(accounts[1]);
              assert.equal(balance, 39000000000000000000012000);
            });


            it('should give 12999999999999999999987000 Token at the startSale of the sale for 999999999999999999999 wei.', async () => {
              //Refactor this to use advanceToBlock(startBlock);
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "999999999999999999999" ,gas: 4700000});
              let balance = await gloInstance.balanceOf(accounts[1]);
              await globCoinSaleInstance.sendTransaction({ from: accounts[2], to: globCoinSaleInstance.address , value: "1" ,gas: 4700000});
              let balance2 = await gloInstance.balanceOf(accounts[2]);
              await globCoinSaleInstance.sendTransaction({ from: accounts[2], to: globCoinSaleInstance.address , value: "1" ,gas: 4700000});
              let balance3 = await gloInstance.balanceOf(accounts[2]);
              assert.equal(balance, 12999999999999999999987000);

            });
            it('should give 115500000000000000000000000 Token at the startSale of the sale for 10000000000000000000000 wei.', async () => {
              //Refactor this to use advanceToBlock(startBlock);
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "10000000000000000000000" ,gas: 4700000});
              let balance = await gloInstance.balanceOf(accounts[1]);
              assert.equal(balance.toNumber(), 115500000000000000000000000);
            });

            it('should be able to buy everything', async () => {
              //Refactor this to use advanceToBlock(startBlock);
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "10000000000000000000000" ,gas: 4700000});
              let balance = await gloInstance.balanceOf(accounts[1]);
              assert.equal(balance, 115500000000000000000000000);
            });

            it('hard cap should be dynamic and depend on presale', async () => {
              //Refactor this to use advanceToBlock(startBlock);
              await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[2]), { from: accounts[0]})
              while (web3.eth.blockNumber < startBlock) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[2], to: globCoinSaleInstance.address , value: "7000000000000000000000" ,gas: 4700000});
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "5000000000000000000000" ,gas: 4700000});
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "1" ,gas: 4700000}).should.be.rejectedWith(revert);
              let balance = await gloInstance.balanceOf(accounts[1]);
              assert.equal(balance, 63000000000000000000000000);
            });

            it('hard cap should be dynamic and depend on presale 2', async () => {
              //Refactor this to use advanceToBlock(startBlock);
              await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[2]), { from: accounts[0]})
              while (web3.eth.blockNumber < startBlock) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[2], to: globCoinSaleInstance.address , value: "4000000000000000000000" ,gas: 4700000});
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "8000000000000000000000" ,gas: 4700000});
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "1" ,gas: 4700000}).should.be.rejectedWith(revert);
              let balance = await gloInstance.balanceOf(accounts[1]);
              let balance2 = await gloInstance.balanceOf(accounts[2]);
              assert.equal(balance, 95500000000000000000000000);
              assert.equal(balance2, 68000000000000000000000000);
            });

            it('hard cap should be dynamic and depend on presale 3', async () => {
              //Refactor this to use advanceToBlock(startBlock);
              await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[2]), { from: accounts[0]})
              while (web3.eth.blockNumber < startBlock) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[2], to: globCoinSaleInstance.address , value: "11999999999999999999999" ,gas: 4700000});
              while (web3.eth.blockNumber < startSale) {
                await advanceBlock()
              }
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "1" ,gas: 4700000});
              await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "1" ,gas: 4700000}).should.be.rejectedWith(revert);
              let balance = await gloInstance.balanceOf(accounts[1]);
              let balance2 = await gloInstance.balanceOf(accounts[2]);
              assert.equal(balance, 13000);
              assert.equal(balance2, 203999999999999999999983000);
            });
        });



        describe('Presale Features', () => {
          let currentBlock = web3.eth.blockNumber;
          let globCoinSaleInstance;
          let gloInstance;
          // start and end timestamps where investments are allowed (both inclusive)
          let startBlock = currentBlock + 3;
          let endPresale = currentBlock + 9;
          let startSale = currentBlock + 15;
          let endBlock = currentBlock + 30 ;
          // presale cap  10 000 ETH
          let presaleCap = 12000000000000000000000;
          // minimum amount of funds to be raised in weis - 1 ETH
          let goal = 1000000000000000000;
          // Maximum amount of funds to be raised - 10 000 ETH
          let cap = 12000000000000000000000;
          // address where funds are collected
          let wallet = "0xcf09f36227aa07e3318fa57a16b453d29ecf786d";


              beforeEach(async () => {
                currentBlock = web3.eth.blockNumber;
                startBlock = currentBlock + 3;
                endPresale = currentBlock + 9;
                startSale = currentBlock + 15;
                endBlock = currentBlock + 30;
                globCoinSaleInstance = await GlobCoinTokenSale.new(startBlock,endPresale,startSale,endBlock,goal,presaleCap,cap,wallet, { from: accounts[0]});
                let gloAddress = await globCoinSaleInstance.token.call();
                gloInstance = GlobCoinToken.at(gloAddress);
              });


              it('should not accept user that arent whitelisted for the presale', async () => {
                while (web3.eth.blockNumber < startBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.sendTransaction({ from: accounts[2], to: globCoinSaleInstance.address , value: "100" ,gas: 4700000}).should.be.rejectedWith(revert);
              });

              it('should accept user that are  whitelisted for the presale', async () => {
                await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[1]), { from: accounts[0]})
                while (web3.eth.blockNumber < startBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "20000000000000000000" ,gas: 4700000});
                await globCoinSaleInstance.sendTransaction({ from: accounts[2], to: globCoinSaleInstance.address , value: "100" ,gas: 4700000}).should.be.rejectedWith(revert);
                let balance = await gloInstance.balanceOf(accounts[1]);
                assert.equal(balance, 340000000000000000000000);
              });

              it('should not accept user during the ICO pause', async () => {
                await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[1]), { from: accounts[0]})
                while (web3.eth.blockNumber < endPresale+1) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "100" ,gas: 4700000}).should.be.rejectedWith(revert);
              });

              it('should stop the presale at StartSale', async () => {
                await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[1]), { from: accounts[0]})
                while (web3.eth.blockNumber < startBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "20000000000000000000" ,gas: 4700000});
                while (web3.eth.blockNumber < startSale) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "20000000000000000000" ,gas: 4700000});
                let balance = await gloInstance.balanceOf(accounts[1]);
                assert.equal(balance, 600000000000000000000000);
              });

              it('should prevent exeeding the Presale hard cap', async () => {
                while (web3.eth.blockNumber < startBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[1]), { from: accounts[0]})
                while (web3.eth.blockNumber < startBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "300000000000000000000000" ,gas: 4700000}).should.be.rejectedWith(revert);
              });

              it('should buy the whole presale thus the whole sale', async () => {
                while (web3.eth.blockNumber < startBlock) {
                  await advanceBlock();
                }
                // buy the whole sale during presale
                await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[1]), { from: accounts[0]});
                await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "12000000000000000000000" ,gas: 4700000});
                while (web3.eth.blockNumber < startSale) {
                  await advanceBlock();
                }
                // try to invest during sale, should fail
                await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "1" ,gas: 4700000}).should.be.rejectedWith(revert);
                await globCoinSaleInstance.finalize({from: accounts[0]}).should.be.rejectedWith(revert);
                let isFinalized = await globCoinSaleInstance.isFinalized();
                assert.isFalse(isFinalized);
                // should finalize after end block
                while (web3.eth.blockNumber < endBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.finalize({from: accounts[0]});
                isFinalized = await globCoinSaleInstance.isFinalized();
                assert.isTrue(isFinalized);
                // max supplies
                let balance = await gloInstance.balanceOf(accounts[1]);
                assert.equal(balance, 204000000000000000000000000);
                let balanceGc = await gloInstance.balanceOf(wallet);
                assert.equal(balanceGc, 306000000000000000000000000);
              });

              it('should able to finalize if the soft cap has been reached at presale', async () => {
                while (web3.eth.blockNumber < startBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[1]), { from: accounts[0]})
                await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "1000000000000000000000" ,gas: 4700000});

                while (web3.eth.blockNumber < endBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.finalize({from: accounts[0]});
                let isFinalized = await globCoinSaleInstance.isFinalized();
                assert.isTrue(isFinalized);
                let vaultAddress = await globCoinSaleInstance.vault();
                let RefundVaultInstance = RefundVault.at(vaultAddress);
                let RefundState = await RefundVaultInstance.state();
                assert.equal(await RefundVaultInstance.state(),2);
              });

              it('should not be able to transfer tokens before the sale has been finalized', async () => {
                while (web3.eth.blockNumber < startBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[1]), { from: accounts[0]})
                await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "1000000000000000000000" ,gas: 4700000});

                await gloInstance.transfer(accounts[3],1000,{from:accounts[1]}).should.be.rejectedWith(revert);
              });

              it('should be able to transfer tokens after the sale has been finalized', async () => {
                while (web3.eth.blockNumber < startBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.whitelistAddressesPresale(new Array(accounts[1]), { from: accounts[0]})
                await globCoinSaleInstance.sendTransaction({ from: accounts[1], to: globCoinSaleInstance.address , value: "1000000000000000000000" ,gas: 4700000});
                while (web3.eth.blockNumber < endBlock) {
                  await advanceBlock();
                }
                await globCoinSaleInstance.finalize({from: accounts[0]});
                await gloInstance.transfer(accounts[3],1000,{from:accounts[1]});
                let balance = await gloInstance.balanceOf(accounts[3]);
                assert.equal(balance,1000);
              });

          });

});
