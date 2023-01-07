function detectCluster(grid, x, y) {

    const type = grid[y][x]
    if (type == undefined)
        return []

    const visited = []
    const output = []
    const frontier = [
        [x, y]
    ]

    const getCell = (x, y) => {
        if (y < 0 || y >= grid.length) { return undefined }
        if (x < 0 || x >= grid[0].length) { return undefined }
        return grid[y][x]
    }

    const isVisited = (x1, y1) => {
        const isPointEqual = ([x2, y2]) => x1 == x2 && y1 == y2
        return visited.find(isPointEqual) != undefined
    }

    let counter = 0
    while (frontier.length > 0) {

        if (counter++ > 100) {
            throw new Error("INFLOOP")
        }

        // Get the next point to search
        const [x, y] = frontier.pop()

        // Have we visited this point before?
        if (isVisited(x, y) == false) {

            // Add to our output set
            visited.push([x, y])
            output.push([x, y])

            // Get neighbor cells
            let xneg = getCell(x - 1, y)
            let xpos = getCell(x + 1, y)
            let yneg = getCell(x, y - 1)
            let ypos = getCell(x, y + 1)

            // ...
            if (xneg == type) frontier.push([x - 1, y])
            if (xpos == type) frontier.push([x + 1, y])
            if (yneg == type) frontier.push([x, y - 1])
            if (ypos == type) frontier.push([x, y + 1])
        }
    }

    console.log(output)

    return output
}

export {
    detectCluster
}