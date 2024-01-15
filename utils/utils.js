exports.filterData = (obj, ...data)=>{
    let newObj = {};
    console.log(obj);
    Object.keys(obj).forEach((elem)=>{
        console.log(elem);
        if(data.includes(elem)){
            newObj[elem] = obj[elem];
        }
    })
    return newObj
}