using Foxel.Models.DataBase;

namespace Foxel.Services.Background.Processors
{
    public interface ITaskProcessor
    {
        Task ProcessAsync(BackgroundTask task);
    }
}
