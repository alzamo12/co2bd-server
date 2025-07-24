


async function getEvents(req, res) {
    const { eventsCollection } = req;
    const { queryDate, title, filter, limit = 5, page = 1 } = req.query;
    // do query
    const query = {};

    if (title) {
        query.title = { $regex: title, $options: 'i' }
    };

    if (filter) {
        query.type = filter
    }

    if (queryDate) {
        const [month, date, year] = queryDate.split("/").map(Number);
        const utcMillis = Date.UTC(year, month - 1, date);

        query.timeStamp = { $gte: utcMillis }
    }

    // do sort
    const sort = {
        timeStamp: 1
    };
    // console.log(title)
    const eventsCount = await eventsCollection.countDocuments(query);

    // work for pagination
    const limitNum = Number(limit);
    const totalPages = Math.ceil(eventsCount / limitNum) || 1;
    const pageNum = Number(page);
    // const skip = limitNum * (pageNum - 1);
    const safePage = pageNum > totalPages ? 1 : pageNum;
    const skip = (safePage - 1) * limitNum;

    const events = await eventsCollection.find(query).sort(sort)
        .skip(skip)
        .limit(limitNum)
        .toArray();
    // console.log(events)
    const result = { eventsCount, events, totalPages, currentPage: safePage };
    res.send(result)
};

module.exports = { getEvents };