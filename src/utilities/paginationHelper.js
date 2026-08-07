
// This is 'reusable' paginate function works with any 'model'/ 'schema' used for 'splitting' data into small 'chunks' instead sending all data together
const paginate = async (model, query = {}, options = {}) => {             // Here we get 'model'(ie 'Product', 'Category' etc),'query'(ie 'search filters')and 'options'(ie page number, limit, and sorting rules etc)
    const page = Math.max(1, parseInt(options.page) || 1);
    const limit = Math.max(1, parseInt(options.limit) || 5);
    const skip = (page - 1) * limit;
    let queryBuilder = model.find(query).skip(skip).limit(limit);       // Here all values passed as 'arguments'.
    if (options.sort) {                                                 // Here if 'options' argument has value like 'sort'(Eg, '{'variants.0.price': 1}' send from front end through 'service'),), then this 'if condition' works.         
        queryBuilder = queryBuilder.sort(options.sort);   
    } else {
        queryBuilder = queryBuilder.sort({ createdAt: -1 });
    }
    if (options.populate) {
        queryBuilder = queryBuilder.populate(options.populate);       // Here 'populate()' is built-in 'mongoose' method and we pass 'populate' data through 'options'(Eg, '{path: 'subCategory', select: 'categoryName gender slug'}' ie 'path' is 'built-in' mongoose keyword and it tells the 'id' of 'subCategory' and find it where is it, and fetch the full 'document' for it and 'select()' retrieve only the given mentioned data, ie it acts like a 'filter')) 
    }
    if (options.select) {
        queryBuilder = queryBuilder.select(options.select);
    }
    if (options.lean !== false) {
        queryBuilder = queryBuilder.lean();
    }
    const [results, totalDocuments] = await Promise.all([           // Here we 'destructuring' the 'array' that return by 'Promise.all()' and finally we 'return' these value from function, and 'Promise.all()' handle only 'Promise' object and almost every 'mongoose' methods(ie  '.find()', '.findOne()', '.countDocuments()', '.save()', '.updateOne()' etc)create a 'Promise' object.
        queryBuilder,                                             
        model.countDocuments(query)                                 // It retrieve 'total' items(ie 'documents')inside 'model'(ie collection)based on 'query'.
    ]);
    const totalPages = Math.ceil(totalDocuments / limit) || 1;

    return {
        results,
        currentPage: page,
        totalPages,
        totalDocuments
    };
};
export default paginate;



// // This is 'reusable' pagination function works with any 'model'/ 'schema'
// const paginate = async (model, req, limit = 5, query = {}) => {  // Here 'model'(ie we can use 'Product','User','Order' etc like schema),'req'(ie for retrieve 'page number'),'limit=5' is 'default parameter' and it works only when there is no argument passess)and 'query={}'(ie it is also 'default parameter' ie 'isDeleted: true' like arguement will passes)
//     const page = parseInt(req.query.page) || 1;                  // If 'req.query'(ie in 'url')'not' contains 'page' number it will put '1' as value.
//     const skip = (page - 1) * limit;                             // If 'user' in page '2' then '(page - 1)*limit' ie '(2 - 1)*3' ie '3' that means 'first' '3' products will skip or 'donot' display like that.
//     const results = await model.find(query)  
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit);
//     const totalDocuments = await model.countDocuments(query);  // 'model' is represents the 'collection' and 'mongoose'  provided a lot of 'built-in' methods like find, findById, updateOne, deleteMany, countDocuments, etc and we can directly use these methods into  'model' ,instead using each files seperately 
//     const totalPages = Math.ceil(totalDocuments / limit);
//     return {
//         results,
//         currentPage: page,
//         totalPages
//     }
// };
// export default paginate;     // Ie it returns 'results' array, 'currentPage' and 'totalPage'.