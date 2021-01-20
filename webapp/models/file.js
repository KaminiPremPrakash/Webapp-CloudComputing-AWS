module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define(
    "file",
    {
      file_name: {
        type: DataTypes.STRING,
        allowNUll: false,
      },
      s3_object_name: {
        type: DataTypes.STRING,
        allowNUll: false,
      },
      file_id: {
        type: DataTypes.UUID,
        allowNUll: false,
        primaryKey: true,
      },
      created_date: {
        type: DataTypes.DATE,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      createdAt: false,
      updatedAt: false,
    }
  );
  File.associate = (models) => {
    File.belongsTo(models.question, {
      as: "attachments",
      foreignKey: "question_id",
    });
  };
  File.associate = (models) => {
    File.belongsTo(models.answer, {
      as: "attachments",
      foreignKey: "answer_id",
    });
  };
  return File;
};
