import * as categoryRepository from '../../repository/admin/adminCategoryRepository.js';
import { CATEGORY_PAGINATION } from '../../constants/adminCategoryConstants.js';

// Internal Helper for slug generation
const generateSlug = (name) => {
    return name.toLowerCase()
               .replace(/[^a-z0-9\s-]/g, '')
               .replace(/\s+/g, '-')
               .trim();
};

export const fetchAddCategoryOptions = async () => {
    return await categoryRepository.findMainCategories();
};

export const executeCategoryCreation = async (bodyData) => {
    const { gender, parentCategory, categoryName, description, isListed } = bodyData;
    const standardizedName = (categoryName || '').trim();

    const isSubCategory = parentCategory && parentCategory !== 'none';
    const parentId = isSubCategory ? parentCategory : null;
    const dynamicSlug = generateSlug(standardizedName);

    // Conflict evaluation
    const conflict = await categoryRepository.findCategoryConflict(standardizedName, gender, parentId);
    if (conflict) {
        throw new Error(`Configuration Lockout: "${standardizedName}" already exists inside this taxonomy position.`);
    }

    return await categoryRepository.createCategory({
        categoryName: standardizedName,
        gender: gender,
        parentCategory: parentId,
        slug: dynamicSlug,
        description: (description || '').trim(),
        isListed: isListed === 'true'
    });
};

export const buildCategoriesListDashboard = async (query) => {
    const page = parseInt(query.page) || 1;
    const limit = CATEGORY_PAGINATION.LIMIT;
    const skip = (page - 1) * limit;
    const searchQuery = query.search || '';
    const error_msg = query.error || null;

    let filterQuery = {};
    if (searchQuery) {
        filterQuery = {
            $or: [
                { categoryName: { $regex: searchQuery, $options: 'i' } },
                { gender: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } }
            ]
        };
    }

    const categories = await categoryRepository.findCategoriesWithFilter(filterQuery, skip, limit);
    const totalMatchingCategories = await categoryRepository.countCategories(filterQuery);

    return {
        categories,
        searchQuery,
        error_msg,
        currentPage: page,
        totalPages: Math.ceil(totalMatchingCategories / limit)
    };
};

export const executeCategoryDeletion = async (categoryId) => {
    // Safety Gate: Check for active children
    const childConflict = await categoryRepository.findChildCategoryByParentId(categoryId);
    if (childConflict) {
        throw new Error(`Action Denied: This item holds active sub-categories (like ${childConflict.categoryName}). Delete those first.`);
    }

    const deletedItem = await categoryRepository.deleteCategoryById(categoryId);
    if (!deletedItem) {
        throw new Error('Target category record could not be found.');
    }
    return deletedItem;
};

export const toggleCategoryListing = async (categoryId) => {
    const category = await categoryRepository.findCategoryById(categoryId);
    if (!category) throw new Error("Target category not found inside registry logs.");

    category.isListed = !category.isListed;
    category.isActive = category.isListed; 
    await category.save();
    return category;
};

export const fetchEditCategoryData = async (categoryId) => {
    const category = await categoryRepository.findCategoryById(categoryId);
    if (!category) throw new Error("Target data directory record not found.");

    const mainCategories = await categoryRepository.findMainCategories(categoryId);
    return { category, mainCategories };
};

export const executeCategoryUpdate = async (categoryId, bodyData) => {
    const { gender, parentCategory, categoryName, description } = bodyData;
    const standardizedName = (categoryName || '').trim();

    const isSubCategory = parentCategory && parentCategory !== 'none';
    const parentId = isSubCategory ? parentCategory : null;
    const structuralSlug = generateSlug(standardizedName);

    // Unique Collision Check excluding self
    const conflict = await categoryRepository.findCategoryConflict(standardizedName, gender, parentId, categoryId);
    if (conflict) {
        throw new Error(`Modification Collision Rejected: A classification listing named "${standardizedName}" already exists.`);
    }

    return await categoryRepository.updateCategoryById(categoryId, {
        categoryName: standardizedName,
        gender: gender,
        parentCategory: parentId,
        slug: structuralSlug,
        description: (description || '').trim()
    });
};