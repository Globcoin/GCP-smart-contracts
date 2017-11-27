pragma solidity ^0.4.11;

import "./crowdsale/CappedCrowdsale.sol";
import "./crowdsale/RefundableCrowdsale.sol";
import './math/SafeMath.sol';
import './GlobCoinToken.sol';

contract GlobCoinTokenSale is CappedCrowdsale, RefundableCrowdsale {

  //Start of the Actual crowdsale. Starblock is the start of the presale.
  uint256 startSale;

  // Presale Rate per wei ~30% bonus over rate1
  uint256 public constant PRESALERATE =  170;

  // new rates
  uint256 public constant RATE1 =  130;
  uint256 public constant RATE2 =  120;
  uint256 public constant RATE3 =  110;
  uint256 public constant RATE4 =  100;


  // Cap per tier for bonus in wei.
  uint256 public constant TIER1 =  10000000000000000000000;
  uint256 public constant TIER2 =  25000000000000000000000;
  uint256 public constant TIER3 =  50000000000000000000000;

  //Presale
  uint256 public weiRaisedPreSale;
  uint256 public presaleCap;

  function GlobCoinTokenSale(uint256 _startBlock,uint256 _startSale, uint256 _endBlock, uint256 _goal,uint256 _presaleCap, uint256 _cap, address _wallet) CappedCrowdsale(_cap) FinalizableCrowdsale() RefundableCrowdsale(_goal) Crowdsale(_startBlock, _endBlock, _wallet) {
    require(_goal <= _cap);
    require(_startSale > _startBlock);
    require(_endBlock > _startSale);
    require(_presaleCap > 0);
    require(_presaleCap < _cap);

    startSale = _startSale;
    presaleCap = _presaleCap;
  }

  function createTokenContract() internal returns (MintableToken) {
    return new GlobCoinToken();
  }

  //white listed address
  mapping (address => bool) public whiteListedAddress;
  mapping (address => bool) public whiteListedAddressPresale;

  modifier onlyPresaleWhitelisted() {
    require( isWhitelistedPresale(msg.sender) ) ;
    _;
  }

  modifier onlyWhitelisted() {
    require( isWhitelisted(msg.sender) || isWhitelistedPresale(msg.sender) ) ;
    _;
  }

  /**
   * @dev Add a list of address to be whitelisted for the crowdsale only.
   * @param _users , the list of user Address. Tested for out of gas until 200 addresses.
   */
  function whitelistAddresses( address[] _users) onlyOwner {
    for( uint i = 0 ; i < _users.length ; i++ ) {
      whiteListedAddress[_users[i]] = true;
    }
  }

  function unwhitelistAddress( address _users) onlyOwner {
    whiteListedAddress[_users] = false;
  }

  /**
   * @dev Add a list of address to be whitelisted for the Presale And sale.
   * @param _users , the list of user Address. Tested for out of gas until 200 addresses.
   */
  function whitelistAddressesPresale( address[] _users) onlyOwner {
    for( uint i = 0 ; i < _users.length ; i++ ) {
      whiteListedAddressPresale[_users[i]] = true;
    }
  }

  function unwhitelistAddressPresale( address _users) onlyOwner {
    whiteListedAddressPresale[_users] = false;
  }

  function isWhitelisted(address _user) public constant returns (bool) {
    return whiteListedAddress[_user];
  }

  function isWhitelistedPresale(address _user) public constant returns (bool) {
    return whiteListedAddressPresale[_user];
  }

  function () payable {
    if (validPurchasePresale()){
      buyTokensPresale(msg.sender);
    } else {
      buyTokens(msg.sender);
    }
  }

  function buyTokens(address beneficiary) payable onlyWhitelisted {
    require(beneficiary != 0x0);
    require(validPurchase());

    uint256 weiAmount = msg.value;
    uint256 tokens = calculateTokenAmount(weiAmount);
    weiRaised = weiRaised.add(weiAmount);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
    forwardFunds();
  }

  function buyTokensPresale(address beneficiary) payable onlyPresaleWhitelisted {
    require(beneficiary != 0x0);
    require(validPurchasePresale());

    uint256 weiAmount = msg.value;
    uint256 tokens = weiAmount.mul(PRESALERATE);
    weiRaisedPreSale = weiRaisedPreSale.add(weiAmount);

    token.mint(beneficiary, tokens);
    TokenPurchase(msg.sender, beneficiary, weiAmount, tokens);
    forwardFunds();
  }

  // calculate the amount of token the user is getting - can overlap on multiple tiers.
  function calculateTokenAmount(uint256 weiAmount) internal returns (uint256){
    uint256 amountToBuy = weiAmount;
    uint256 amountTokenBought;
    uint256 currentWeiRaised = weiRaised;
     if (currentWeiRaised < TIER1 && amountToBuy > 0) {
       var (amountBoughtInTier, amountLeftTobuy) = calculateAmountPerTier(amountToBuy,TIER1,RATE1,currentWeiRaised);
       amountTokenBought = amountTokenBought.add(amountBoughtInTier);
       currentWeiRaised = currentWeiRaised.add(amountToBuy.sub(amountLeftTobuy));
       amountToBuy = amountLeftTobuy;
     }
     if (currentWeiRaised < TIER2 && amountToBuy > 0) {
      (amountBoughtInTier, amountLeftTobuy) = calculateAmountPerTier(amountToBuy,TIER2,RATE2,currentWeiRaised);
      amountTokenBought = amountTokenBought.add(amountBoughtInTier);
      currentWeiRaised = currentWeiRaised.add(amountToBuy.sub(amountLeftTobuy));
      amountToBuy = amountLeftTobuy;
     }
     if (currentWeiRaised < TIER3 && amountToBuy > 0) {
      (amountBoughtInTier, amountLeftTobuy) = calculateAmountPerTier(amountToBuy,TIER3,RATE3,currentWeiRaised);
      amountTokenBought = amountTokenBought.add(amountBoughtInTier);
      currentWeiRaised = currentWeiRaised.add(amountToBuy.sub(amountLeftTobuy));
      amountToBuy = amountLeftTobuy;
     }
    if ( currentWeiRaised < cap && amountToBuy > 0) {
      (amountBoughtInTier, amountLeftTobuy) = calculateAmountPerTier(amountToBuy,cap,RATE4,currentWeiRaised);
      amountTokenBought = amountTokenBought.add(amountBoughtInTier);
      currentWeiRaised = currentWeiRaised.add(amountToBuy.sub(amountLeftTobuy));
      amountToBuy = amountLeftTobuy;
    }
    return amountTokenBought;
  }

  // calculate the amount of token within a tier.
  function calculateAmountPerTier(uint256 amountToBuy,uint256 tier,uint256 rate,uint256 currentWeiRaised) internal returns (uint256,uint256) {
    uint256 amountAvailable = tier.sub(currentWeiRaised);
    if ( amountToBuy > amountAvailable ) {
      uint256 amountBoughtInTier = amountAvailable.mul(rate);
      amountToBuy = amountToBuy.sub(amountAvailable);
      return (amountBoughtInTier,amountToBuy);
    } else {
      amountBoughtInTier = amountToBuy.mul(rate);
      return (amountBoughtInTier,0);
    }
  }

  function finalization() internal {
    if (goalReached()) {
      //Globcoin gets 100% of the amount of tokens created through the crowdsale. (50% of the total token)
      uint256 totalSupply = token.totalSupply();
      token.mint(wallet, totalSupply);
      token.finishMinting();
    }
    super.finalization();
  }

  // Override of the validPurchase function so that the new sale periode start at StartSale instead of Startblock.
  function validPurchase() internal constant returns (bool) {
    bool withinPeriod = block.number >= startSale && block.number <= endBlock;
    bool nonZeroPurchase = msg.value != 0;
    bool withinCap = weiRaised.add(msg.value) <= cap;
    return withinCap && withinPeriod && nonZeroPurchase;
  }

  // Sale period start at StartBlock until the sale Start ( startSale )
  function validPurchasePresale() internal constant returns (bool) {
    bool withinPeriod = block.number >= startBlock && block.number < startSale;
    bool nonZeroPurchase = msg.value != 0;
    bool withinCap = weiRaisedPreSale.add(msg.value) <= presaleCap;
    return withinPeriod && nonZeroPurchase && withinCap;
  }

  // Override of the goalReached function so that the goal take into account the token raised during the Presale.
  function goalReached() public constant returns (bool) {
    uint256 totalWeiRaised = weiRaisedPreSale.add(weiRaised);
    return totalWeiRaised >= goal || super.goalReached();
  }

}
