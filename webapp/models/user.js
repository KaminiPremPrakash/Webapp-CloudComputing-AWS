module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "users",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        // unique: true,
        allowNUll: false,
      },
      email_address: {
        type: DataTypes.STRING,
        allowNUll: false,
      },
      password: {
        type: DataTypes.STRING,
        allowNUll: false,
      },
      first_name: {
        type: DataTypes.STRING,
      },
      last_name: {
        type: DataTypes.STRING,
        allowNUll: false,
      },
      account_created: {
        type: DataTypes.DATE,
        allowNUll: false,
      },
      account_updated: {
        type: DataTypes.DATE,
        allowNUll: false,
      },
    },
    {
      timestamps: true,
      createdAt: false,
      updatedAt: false,
    }
  );
  return User;
};
