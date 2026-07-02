// This is 'reusable' pagination function works with any 'model'/ 'schema'
const paginate = async (model, req, limit = 5, query = {}) => {  // Here 'model'(ie we can use 'Product','User','Order' etc like schema),'req'(ie for retrieve 'page number'),'limit=5' is 'default parameter' and it works only when there is no argument passess)and 'query={}'(ie it is also 'default parameter' ie 'isDeleted: true' like arguement will passes)
    const page = parseInt(req.query.page) || 1;                  // If 'req.query'(ie in 'url')'not' contains 'page' number it will put '1' as value.
    const skip = (page - 1) * limit;                             // If 'user' in page '2' then '(page - 1)*limit' ie '(2 - 1)*3' ie '3' that means 'first' '3' products will skip or 'donot' display like that.
    const results = await model.find(query)  
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const totalDocuments = await model.countDocuments(query);  // 'model' is represents the 'collection' and 'mongoose'  provided a lot of 'built-in' methods like find, findById, updateOne, deleteMany, countDocuments, etc and we can directly use these methods into  'model' ,instead using each files seperately 
    const totalPages = Math.ceil(totalDocuments / limit);
    return {
        results,
        currentPage: page,
        totalPages
    }
};
export default paginate;     // Ie it returns 'results' array, 'currentPage' and 'totalPage'.