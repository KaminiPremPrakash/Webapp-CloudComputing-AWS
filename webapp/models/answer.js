module.exports = (sequelize, DataTypes) => {
  const Answer = sequelize.define(
    "answer",
    {
      answer_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        // unique: true,
        allowNUll: false,
      },
      question_id: {
        type: DataTypes.UUID,
        allowNUll: false,
      },
      created_timestamp: {
        type: DataTypes.DATE,
        allowNUll: false,
      },
      updated_timestamp: {
        type: DataTypes.DATE,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNUll: false,
      },
      answer_text: {
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
  Answer.associate = (models) => {
    Answer.belongsTo(models.question, {
      as: "answers",
      foreignKey: "question_id",
    });
    Answer.hasMany(models.file, {
      as: "attachments",
      foreignKey: "answer_id",
    });
  };
  return Answer;
};
