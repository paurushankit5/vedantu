const Joi = require('@hapi/joi');

const DAL = require('../dal/dal')


class ProductController{
    
    async test(req){
        let abc = await OrderDAl.test()
        return abc
    }

    //TODO:  write a set of code that runs on every minute and update the unreserved_quantity of sku 
    //for each row present in the reserved_products table and current_time > expires_on.
    //This basically means, placing order has been cancelled ion between and the stock needs to be refreshed

    async placeOrder(payload){
        try{
            const validatedPayload = await this.validateOrderPayload(payload)
            if(!await DAL.checkIfUserExists(validatedPayload.user_id)) throw new Error('Invalid User')
            const order = await DAL.storeOrder(validatedPayload)
            return order
        }
        catch (err) { 
            throw new Error(err.message) 
        }
    }

    

    

    async validateOrderPayload(payload){
        const schema = Joi.object({
            user_id: Joi.number().required(),
            products:  Joi.array().items({
                "product_id": Joi.number().required(),
                "qty": Joi.number().required(),
                "variant_details": Joi.object().required()
            })
        
        }).unknown(false);

        try {
            const value = await schema.validateAsync(payload);
            return value
        }
        catch (err) { 
            throw new Error(err.message) 
        }
    }
}

module.exports = new ProductController()