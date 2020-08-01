
const { Client } = require('pg')
const db_config = require('../config/db.json')


class DAL{
    constructor(){
        this.client = new Client(db_config)
        this.client.connect()
    }

    async test(){
        let abc = await this.client.query("select * from users")
        return abc.rows
    }
    

    async checkIfUserExists(user_id){
        let abc = await this.client.query(`select id from users where id = ${user_id}`)
        if(abc.rows.length) return true

        return false
    } 

    async storeOrder(payload){
        if(payload.products){
            await this.client.query('BEGIN')
            try{
                let order = await this.insertOrder(this.client,payload.user_id) // sending client object for transaction
                let total_price_value = 0;
                for(const product of payload.products){
                    let sku = await this.CheckAndGetIfStockExist(product)
                    if(sku){
                        //update column unreserved_quantity = unreserved_quantity - requested_quantity of sku table
                        await this. updateSkuQty(this.client, sku.id,'unreserved_quantity', product.qty, ' - ' )
                        
                        //insert into reserved products, this is for race conditions, if the transaction fails somwhow, then a cron will update the reserved_qty of sku table for that particular row
                        let reserved_product =  await this.insertReservedProducts(this.client, sku.id, product.qty)
                        
                        //insert order item
                        let orderItem = await this.insertOrderItem(this.client, product,sku, order.id)

                        //add total price value
                        total_price_value += orderItem.price_per_unit * orderItem.quantity

                        //update column quantity = quantity - requested_quantity of sku table 
                        await this. updateSkuQty(this.client, sku.id,'quantity', orderItem.quantity, ' - ' )

                        //delete entry from reserved_products
                        await this.deleteReservedProducts(this.client, reserved_product.id)
                        
                        
                    }
                    else{
                        await this.client.query('ROLLBACK')
                        return 'Order can not be processed as the item is unavailable'
                    }
                    
                }
                //update the total_price_value in orders table
                await this.updateOrder(this.client, order.id, total_price_value)
                //await this.client.query('ROLLBACK')
                
                await this.client.query('COMMIT')
                return {
                            "msg" : "Product added successfully",
                            "order_details": order
                        }
            }catch(err){
                await this.client.query('ROLLBACK')
                throw new Error(err)

            }



        }
    }

    
    async updateOrder(client = this.client, id, total_price_value){
        try{
            let query = ` update orders set total_price_value = ${total_price_value} where id = ${id}`
            return await client.query(query)
        }catch(err){
            throw new Error(err.message)
        }
    }

    async deleteReservedProducts(client= this.client, id){
        try{
            let query =  `Delete from reserved_products where id = ${id}`
            return await client.query(query)
        }catch(err){
            throw new Error(err.message)
        }
    }

    async updateSkuQty(client, id,column, qty_changed, operator ){
        try{
            let query =  `update sku set ${column} = ${column} ${operator} ${qty_changed} where id = ${id}`
            return await client.query(query)
        }catch(err){
            throw new Error(err.message)
        }
    }

    async insertOrderItem(client = this.client, productPayload, sku, order_id){
        try{
            const query = `insert into order_items (order_id, quantity, price_per_unit, sku_id, created_on, updated_on)  values (${order_id}, ${productPayload.qty}, ${sku.price_per_unit}, ${sku.id}, now(), now() ) Returning *`

            const res = await client.query(query)
            return res.rows[0]
        }catch(err){
            throw new Error(err.message)
        }

    }

    async insertReservedProducts(client = this.client, sku_id, qty){
        try{
            let query =  `insert into reserved_products (sku_id, qty, expires_on, created_on, updated_on) values (${sku_id}, ${qty}, current_timestamp + (5 ||' minutes')::interval, now(), now()) returning *`
            const res = await client.query(query)
            return res.rows[0]
        }catch(err){
            throw new Error(err.message)
        }

    }

    async insertOrder(client = this.client, user_id){
        try{
            let query =  `insert into orders (user_id, created_on, updated_on) values (${user_id}, now(), now()) returning *`
            const res = await client.query(query)
            return res.rows[0]
        }catch(err){
            throw new Error(err.message)
        }

    }

    async CheckAndGetIfStockExist(payload){
        let query = `select s.* from sku s inner join products p on (p.id = s.product_id) where s.product_id=${payload.product_id} and unreserved_quantity >= ${payload.qty}`
        if(payload.variant_details){
            let keys = Object.keys(payload.variant_details)
            if(keys.length){
                for (const key of keys){
                    query += ` and variants->>'${key}' = '${payload.variant_details[key]}' `
                }
            }
        }
        query += 'limit 1'
        let res = await this.client.query(query)
        if(res.rows.length) return res.rows[0]
        return null

    }
}

module.exports = new DAL()