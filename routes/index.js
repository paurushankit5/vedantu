var express = require('express');
var router = express.Router();
const ProductController = require('../controllers/product-controller')

/* GET home page. */
router.get('/', async function(req, res, next) {
  const response = await ProductController.test(req)
  res.send(response);
});

router.post('/order', async function(req, res, next) {
  try{
    const response = await ProductController.placeOrder(req.body)
    let abc
    res.send(response);
  }catch(err){
    next(err)
  }
  
});

module.exports = router;
