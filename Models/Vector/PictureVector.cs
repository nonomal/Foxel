namespace Foxel.Models.Vector;

using Microsoft.Extensions.VectorData;

public class PictureVector
{
    [VectorStoreKey] public int Id { get; set; }
    [VectorStoreData] public string? Name { get; set; }

    [VectorStoreVector(Dimensions: 1024, DistanceFunction = DistanceFunction.CosineSimilarity)]
    public ReadOnlyMemory<float>? Embedding { get; set; }
}