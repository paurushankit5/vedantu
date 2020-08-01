# Vedantu Assignment

## Steps to setup
- Clone Repo
- Install Dependencies
- Change the DB config for postgres in 'config/db.json' file (I have not used env file for the assignment)
- Import DB from schema/db.sql
- Command to start the Application
> DEBUG=vedantu:* npm start   


## Database Modelling
I have used postgres DB as this supports Transaction and querying JSON is far simpler than other RDBMS. The tables used are
- category
- users
- products
- filters
- filter_values
- orders
- order_items
- reserved_products

### Catgeory Table
It is used as parent of a product

### Filters and Filter_values table
These table are used to provide variant details of a product.


### SKU Table
This is the table where all the actual data of aproduct is stored. 
- sku_code is code for a variant of a product
- quantity is the actual quantity available for that variant of product
- unreserved_quantity is the quantity on which a user can place an order. So once, you start to place order, the unreserved_quantity reduces as per the requested quantity (given that unreserved_quantity >= requested_quantity) and there is an entry in the reserved_prodiucts table with the order_id and expiry limit is set to 5 mins. If a order can been cancelled there will be a cron that will again refresh the reserved_quantity of sku table.
- There is a column called variants whick store data in json. The data in the column is something like this
> {"1": "1", "2": "5"}
- The json actually means
> {"filter_id_1": "filter_value_id_1","filter_id_2":"filter_value_id_2"}


### API Call
> curl --location --request POST 'localhost:3000/order' \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data-raw '{
    "user_id": 1,
    "productss": [
        {
            "product_id": 1,
            "qty": 3,
            "variant_details": {
                "1": "1",
                "2": "4"
            }
        }
    ]
}'

