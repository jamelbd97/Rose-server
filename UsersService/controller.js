let User = require("./model");

exports.get = async (req, res) => {
  res.send({ user: await User.findById(req.body._id) });
};

exports.getAll = async (req, res) => {
  res.send({ users: await User.find() });
};

exports.add = async (req, res) => {
  const { name, type } = req.body;
  let user = await new User({ name: name, type: type }).save();
  return res.send({ message: "User added successfully", user });
};

exports.update = async (req, res) => {
  const { _id, name, type } = req.body;
  let user = await User.findById(_id);
  if (user) {
    await user.update({ $set: { name: name, type: type } });
    return res.send({ message: "User updated successfully" });
  } else {
    return res.send({ message: "User does not exist" });
  }
};

exports.delete = async (req, res) => {
  let user = await User.findById(req.body._id);
  if (user) {
    await user.remove();
    return res.send({ message: "Users" + user._id + " have been deleted" });
  } else {
    return res.send({ message: "User does not exist" });
  }
};

exports.deleteAll = async (req, res) => {
  await User.remove({});
  res.send({ message: "All users have been deleted" });
};

