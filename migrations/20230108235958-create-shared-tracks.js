'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'SharedTracks',
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            unique: true,
          },
          trackId: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          providerUserId: {
            type: Sequelize.UUID,
            allowNull: false,
          },
          provider: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          chat_id: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction },
      );
      await queryInterface.addIndex('SharedTracks', ['trackId'], {
        unique: false,
        name: 'sharedtrack_track_id_idx',
        transaction,
      });
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('SharedTracks', { transaction });
      await queryInterface.removeIndex(
        'SharedTracks',
        'sharedtrack_track_id_idx',
        { transaction },
      );
    });
  },
};
