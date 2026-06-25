// A reusable function that works for any Mongoose Model
const paginate = async (model, req, limit = 5, query = {}) => {  
    const page = parseInt(req.query.page) || 1;    // Get the page from the URL
    const skip = (page - 1) * limit;
    const results = await model.find(query)  // Fetch the specific slice of data
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    const totalDocuments = await model.countDocuments(query); 
    const totalPages = Math.ceil(totalDocuments / limit);
    return {
        results,
        currentPage: page,
        totalPages
    };
};

export default paginate;