import messageSchema from './message.mjs';

const messages = {

    getAllMessages: async function() {
      try {
        const messages = await messageSchema.find({});
        return messages;
      } catch (e) {
        return {
          errors: {
            status: 500,
            source: "/getAllMessages",
            title: "Database error",
            detail: e.message
          }
        };
      }
    },

    deleteAll: async function() {
        try {
          await messageSchema.deleteMany({});
          console.log(`All messages have been deleted.`);
        } catch (e) {
          console.error(e);
          throw new Error("An error occurred while deleting the messages.");
        }
      },
    };

export default messages;