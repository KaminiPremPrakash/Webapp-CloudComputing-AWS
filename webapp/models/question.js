module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define(
    "question",
    {
      question_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        // unique: true,
        allowNUll: false,
      },
      created_timestamp: {
        type: DataTypes.DATE,
        allowNUll: false,
      },
      updated_timestamp: {
        type: DataTypes.DATE,
        allowNUll: false,
      },
      user_id: {
        type: DataTypes.UUID,
      },
      question_text: {
        type: DataTypes.STRING,
        allowNUll: false,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: false,
      updatedAt: false,
    }
  );
  Question.associate = (models) => {
    Question.belongsToMany(models.category, {
      through: "questioncategory",
    });
    Question.hasMany(models.answer, {
      as: "answers",
      foreignKey: "question_id",
    });
    Question.hasMany(models.file, {
      as: "attachments",
      foreignKey: "question_id",
    });
  };
  return Question;
};
