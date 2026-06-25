// Navigating up two levels to 'src', then into 'model'
import Category from '../../model/categoryModel.js';

export const findMainCategories = async (excludeId = null) => {
    let query = { parentCategory: null };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    return await Category.find(query).sort({ categoryName: 1 });
};

export const findCategoryConflict = async (name, gender, parentId, excludeId = null) => {
    let query = {
        categoryName: { $regex: `^${name}$`, $options: 'i' },
        gender: gender,
        parentCategory: parentId
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    return await Category.findOne(query);
};

export const createCategory = async (categoryData) => {
    const newCategory = new Category(categoryData);
    return await newCategory.save();
};

export const findCategoriesWithFilter = async (filterQuery, skip, limit) => {
    return await Category.find(filterQuery)
        .populate('parentCategory')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

export const countCategories = async (filterQuery) => {
    return await Category.countDocuments(filterQuery);
};

export const findChildCategoryByParentId = async (parentId) => {
    return await Category.findOne({ parentCategory: parentId });
};

export const deleteCategoryById = async (id) => {
    return await Category.findByIdAndDelete(id);
};

export const findCategoryById = async (id) => {
    return await Category.findById(id);
};

export const updateCategoryById = async (id, updateData) => {
    return await Category.findByIdAndUpdate(id, updateData);
};