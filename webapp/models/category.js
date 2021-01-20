module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define(
    "category",
    {
      category_id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      category: {
        type: DataTypes.STRING,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: false,
      updatedAt: false,
    }
  );
  Category.associate = (models) => {
    Category.belongsToMany(models.question, {
      through: "questioncategory",
    });
  };
  return Category;
};
